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
import type { WorkerProfile, UserRole } from "@prisma/client";

// ── Tipos públicos ────────────────────────────────────────────────

export type CollaboratorMonthlySummary = {
  assigneeId:      string;
  assigneeName:    string;
  /** Papel técnico do colaborador (DEV | SUPORTE | ARQUITETO) */
  assigneeRole:    string;
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

// ── Sort options (validação de entrada) ───────────────────────────

export const SORT_OPTIONS = [
  { value: "finalValue:desc",     label: "Maior valor final"    },
  { value: "finalValue:asc",      label: "Menor valor final"    },
  { value: "estimatedValue:desc", label: "Maior valor estimado" },
  { value: "estimatedValue:asc",  label: "Menor valor estimado" },
  { value: "portfolioValue:desc", label: "Maior carteira"       },
  { value: "approvedCount:desc",  label: "Mais aprovadas"       },
  { value: "name:asc",            label: "Nome A → Z"           },
  { value: "name:desc",           label: "Nome Z → A"           },
] as const;

const VALID_SORT_BY  = ["finalValue", "estimatedValue", "portfolioValue", "approvedCount", "name"] as const;
const VALID_SORT_DIR = ["asc", "desc"] as const;
type SortBy  = typeof VALID_SORT_BY[number];
type SortDir = typeof VALID_SORT_DIR[number];

function parseSortBy(s?: string):  SortBy  { return (VALID_SORT_BY  as readonly string[]).includes(s ?? "") ? s as SortBy  : "finalValue"; }
function parseSortDir(s?: string): SortDir { return (VALID_SORT_DIR as readonly string[]).includes(s ?? "") ? s as SortDir : "desc"; }

// ── Helpers ───────────────────────────────────────────────────────

function periodBounds(month: number, year: number): { start: Date; end: Date } {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end   = new Date(year, month,     0, 23, 59, 59, 999);
  return { start, end };
}

// ── Service ───────────────────────────────────────────────────────

export const dashboardService = {

  /**
   * Retorna o resumo mensal de todos os colaboradores (ou filtrado).
   *
   * Filtros disponíveis:
   *  - assigneeId : um colaborador específico
   *  - role       : DEV | SUPORTE | ARQUITETO
   *  - profile    : JUNIOR | PLENO | SENIOR | ESPECIALISTA
   *  - sortBy     : finalValue | estimatedValue | portfolioValue | approvedCount | name
   *  - sortDir    : asc | desc
   */
  async getMonthlySummary(
    month: number,
    year:  number,
    opts: {
      assigneeId?: string;
      role?:       string;
      profile?:    string;
      sortBy?:     string;
      sortDir?:    string;
    } = {},
  ): Promise<MonthlyDashboardSummary> {
    const {
      assigneeId,
      role,
      profile,
    } = opts;
    const sortBy  = parseSortBy(opts.sortBy);
    const sortDir = parseSortDir(opts.sortDir);

    const { start, end } = periodBounds(month, year);

    // ── Resolver IDs elegíveis baseado em papel/perfil ──────────
    let assigneeFilter: { assigneeId: string | { in: string[] } | { not: null } };

    if (assigneeId) {
      assigneeFilter = { assigneeId };
    } else if (role || profile) {
      const eligible = await prisma.user.findMany({
        where: {
          ...(role
            ? { role: role as UserRole }
            : { role: { in: ["DEV", "SUPORTE", "ARQUITETO"] as UserRole[] } }),
          ...(profile ? { workerProfile: profile as WorkerProfile } : {}),
        },
        select: { id: true },
      });
      assigneeFilter = { assigneeId: { in: eligible.map(u => u.id) } };
    } else {
      assigneeFilter = { assigneeId: { not: null } };
    }

    const demandSelect = {
      id:                      true,
      assigneeId:              true,
      estimatedHours:          true,
      estimatedDemandValue:    true,
      assigneeProfileSnapshot: true,
      assignee: { select: { id: true, name: true, workerProfile: true, role: true } },
    } as const;

    // ── Demandas aprovadas no período (valor estimado) ───────────
    const approvedRaw = await prisma.demand.findMany({
      where: { ...assigneeFilter, approvedAt: { gte: start, lte: end } },
      select: demandSelect,
    });

    // ── Demandas homologadas no período (valor final) ────────────
    const homologatedRaw = await prisma.demand.findMany({
      where: { ...assigneeFilter, homologationDate: { gte: start, lte: end } },
      select: demandSelect,
    });

    // ── Carteira total — todas as demandas, sem filtro de período
    const portfolioRaw = await prisma.demand.findMany({
      where: assigneeFilter,
      select: {
        assigneeId:              true,
        estimatedDemandValue:    true,
        assigneeProfileSnapshot: true,
        assignee: { select: { id: true, name: true, workerProfile: true, role: true } },
      },
    });

    // ── Agrega por colaborador ───────────────────────────────────
    const map = new Map<string, CollaboratorMonthlySummary>();

    type AssigneeShape = {
      id: string; name: string; workerProfile: WorkerProfile | null; role: string;
    } | null;

    function getOrInit(d: {
      assigneeId:              string | null;
      assignee:                AssigneeShape;
      assigneeProfileSnapshot: string | null;
    }): CollaboratorMonthlySummary | null {
      if (!d.assigneeId || !d.assignee) return null;
      if (!map.has(d.assigneeId)) {
        map.set(d.assigneeId, {
          assigneeId:       d.assigneeId,
          assigneeName:     d.assignee.name,
          assigneeRole:     d.assignee.role,
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

    // ── Ordena conforme parâmetro ────────────────────────────────
    const dir = sortDir === "asc" ? 1 : -1;
    const collaborators = Array.from(map.values()).sort((a, b) => {
      switch (sortBy) {
        case "name":           return dir * a.assigneeName.localeCompare(b.assigneeName, "pt-BR");
        case "estimatedValue": return dir * (a.estimatedValue - b.estimatedValue);
        case "portfolioValue": return dir * (a.portfolioValue - b.portfolioValue);
        case "approvedCount":  return dir * (a.approvedCount  - b.approvedCount);
        default:               return dir * (a.finalValue     - b.finalValue);
      }
    });

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
