/**
 * dashboardService — Resumo mensal por colaborador
 *
 * Retorna três conjuntos de dados por colaborador:
 *
 *  · Valor estimado  = SUM(estimatedDemandValue) das demandas com
 *    `approvedAt` no período — o que foi comprometido/iniciado.
 *
 *  · Valor final     = SUM(estimatedDemandValue) das demandas com
 *    `homologationDate` no período — o que foi efetivamente entregue
 *    e homologado.
 *
 *  · Valor previsto  = SUM(estimatedDemandValue) de TODAS as demandas
 *    do colaborador, sem filtro de período (carteira total).
 *
 * ⚠  Valor final = estimatedDemandValue por enquanto.
 *    Deflator por atraso e fechamento de RV/comissão NÃO implementados.
 */

import { prisma } from "@/lib/prisma";
import type { WorkerProfile } from "@prisma/client";

// ── Tipos públicos ────────────────────────────────────────────────

export type CollaboratorMonthlySummary = {
  assigneeId:      string;
  assigneeName:    string;
  assigneeProfile: WorkerProfile | null;

  /** Demandas aprovadas (iniciadas) no período */
  approvedCount:   number;
  approvedHours:   number;
  /** Soma de estimatedDemandValue das demandas aprovadas no período */
  estimatedValue:  number;

  /** Demandas homologadas (entregues) no período */
  homologatedCount: number;
  homologatedHours: number;
  /** Soma de estimatedDemandValue das demandas homologadas no período */
  finalValue:       number;

  /** Carteira total — todas as demandas, sem filtro de período */
  portfolioCount: number;
  /** Soma de estimatedDemandValue de todas as demandas do colaborador */
  portfolioValue: number;
};

export type MonthlyDashboardSummary = {
  month:  number;
  year:   number;
  collaborators: CollaboratorMonthlySummary[];
  totals: {
    approvedCount:    number;
    estimatedValue:   number;
    homologatedCount: number;
    finalValue:       number;
    approvedHours:    number;
    homologatedHours: number;
    portfolioCount:   number;
    portfolioValue:   number;
  };
};

export type DevCollaborator = {
  id:      string;
  name:    string;
  profile: WorkerProfile | null;
};

// ── Helpers ───────────────────────────────────────────────────────

function periodBounds(month: number, year: number): { start: Date; end: Date } {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end   = new Date(year, month,     0, 23, 59, 59, 999);
  return { start, end };
}

// ── Service ───────────────────────────────────────────────────────

export const dashboardService = {

  /**
   * Retorna o resumo mensal de todos os colaboradores (ou de um específico).
   * O período é determinado pelo mês/ano dos campos approvedAt e homologationDate.
   * A coluna "carteira total" agrega todas as demandas sem filtro de período.
   */
  async getMonthlySummary(
    month: number,
    year:  number,
    assigneeId?: string,
  ): Promise<MonthlyDashboardSummary> {
    const { start, end } = periodBounds(month, year);

    const assigneeFilter = assigneeId
      ? { assigneeId }
      : { assigneeId: { not: null } };

    const demandSelect = {
      id:                    true,
      assigneeId:            true,
      estimatedHours:        true,
      estimatedDemandValue:  true,
      assigneeProfileSnapshot: true,
      assignee: { select: { id: true, name: true, workerProfile: true } },
    } as const;

    // Demandas aprovadas no período (valor estimado)
    const approvedRaw = await prisma.demand.findMany({
      where: { ...assigneeFilter, approvedAt: { gte: start, lte: end } },
      select: demandSelect,
    });

    // Demandas homologadas no período (valor final)
    const homologatedRaw = await prisma.demand.findMany({
      where: { ...assigneeFilter, homologationDate: { gte: start, lte: end } },
      select: demandSelect,
    });

    // Carteira total — todas as demandas, sem filtro de período
    const portfolioRaw = await prisma.demand.findMany({
      where: assigneeFilter,
      select: {
        assigneeId:           true,
        estimatedDemandValue: true,
        assignee: { select: { id: true, name: true, workerProfile: true } },
        assigneeProfileSnapshot: true,
      },
    });

    // Agrega por colaborador
    const map = new Map<string, CollaboratorMonthlySummary>();

    function getOrInit(d: {
      assigneeId: string | null;
      assignee: { id: string; name: string; workerProfile: WorkerProfile | null } | null;
      assigneeProfileSnapshot: string | null;
    }): CollaboratorMonthlySummary | null {
      if (!d.assigneeId || !d.assignee) return null;
      if (!map.has(d.assigneeId)) {
        map.set(d.assigneeId, {
          assigneeId:       d.assigneeId,
          assigneeName:     d.assignee.name,
          assigneeProfile:  (d.assigneeProfileSnapshot as WorkerProfile | null)
                           ?? d.assignee.workerProfile,
          approvedCount:    0,
          approvedHours:    0,
          estimatedValue:   0,
          homologatedCount: 0,
          homologatedHours: 0,
          finalValue:       0,
          portfolioCount:   0,
          portfolioValue:   0,
        });
      }
      return map.get(d.assigneeId)!;
    }

    for (const d of approvedRaw) {
      const c = getOrInit(d);
      if (!c) continue;
      c.approvedCount++;
      c.approvedHours  += d.estimatedHours       ?? 0;
      c.estimatedValue += d.estimatedDemandValue ?? 0;
    }

    for (const d of homologatedRaw) {
      const c = getOrInit(d);
      if (!c) continue;
      c.homologatedCount++;
      c.homologatedHours += d.estimatedHours       ?? 0;
      c.finalValue       += d.estimatedDemandValue ?? 0;
    }

    // Portfolio: só atualiza colaboradores já presentes no mapa do período
    for (const d of portfolioRaw) {
      if (!d.assigneeId) continue;
      const c = map.get(d.assigneeId);
      if (!c) continue;
      c.portfolioCount++;
      c.portfolioValue += d.estimatedDemandValue ?? 0;
    }

    // Ordena por valor final desc, depois por valor estimado desc
    const collaborators = Array.from(map.values()).sort(
      (a, b) => b.finalValue - a.finalValue || b.estimatedValue - a.estimatedValue,
    );

    const totals = collaborators.reduce(
      (acc, c) => ({
        approvedCount:    acc.approvedCount    + c.approvedCount,
        estimatedValue:   acc.estimatedValue   + c.estimatedValue,
        approvedHours:    acc.approvedHours    + c.approvedHours,
        homologatedCount: acc.homologatedCount + c.homologatedCount,
        finalValue:       acc.finalValue       + c.finalValue,
        homologatedHours: acc.homologatedHours + c.homologatedHours,
        portfolioCount:   acc.portfolioCount   + c.portfolioCount,
        portfolioValue:   acc.portfolioValue   + c.portfolioValue,
      }),
      {
        approvedCount: 0, estimatedValue: 0, approvedHours: 0,
        homologatedCount: 0, finalValue: 0, homologatedHours: 0,
        portfolioCount: 0, portfolioValue: 0,
      },
    );

    return { month, year, collaborators, totals };
  },

  /** Lista colaboradores técnicos ativos (DEV, SUPORTE, ARQUITETO) para o filtro de seleção */
  async getDevCollaborators(): Promise<DevCollaborator[]> {
    const users = await prisma.user.findMany({
      where:   { role: { in: ["DEV", "SUPORTE", "ARQUITETO"] }, isActive: true },
      select:  { id: true, name: true, workerProfile: true },
      orderBy: { name: "asc" },
    });
    return users.map((u) => ({ id: u.id, name: u.name, profile: u.workerProfile }));
  },
};
