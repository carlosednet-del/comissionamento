import { prisma }       from "@/lib/prisma";
import { auditService } from "@/services/auditService";
import type {
  DapClosingFilters,
  DapClosingPreview,
  DapDeveloperRow,
  DapDemandRow,
} from "@/types";
import type { StatementStatus } from "@prisma/client";

// ── Helpers ───────────────────────────────────────────────────────

function periodBounds(month: number, year: number) {
  return {
    gte: new Date(year, month - 1, 1, 0, 0, 0, 0),
    lte: new Date(year, month, 0, 23, 59, 59, 999),
  };
}

const SEP  = ";";
const BOM  = "﻿";
const CRLF = "\n";

function esc(v: string | null | undefined): string {
  const s = String(v ?? "");
  if (s.includes(SEP) || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return "";
  const dd  = String(dt.getDate()).padStart(2, "0");
  const mm  = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return "";
  return `${fmtDate(dt)} ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
}

function fmtDecimal(v: number | null | undefined): string {
  if (v === null || v === undefined) return "";
  return v.toFixed(2).replace(".", ",");
}

// ── Consulta central ──────────────────────────────────────────────

async function fetchDemandsForPeriod(month: number, year: number) {
  const { gte, lte } = periodBounds(month, year);
  return prisma.demand.findMany({
    where: {
      status:          "HOMOLOGADA_PRODUCAO",
      homologationDate: { gte, lte },
      assigneeId:      { not: null },
    },
    include: {
      assignee: {
        select: { id: true, name: true, email: true, workerProfile: true },
      },
    },
    orderBy: [{ assigneeId: "asc" }, { homologationDate: "asc" }],
  });
}

async function fetchStatementsForPeriod(
  developerIds: string[],
  month: number,
  year: number,
) {
  if (developerIds.length === 0) return [];
  return prisma.developerMonthlyStatement.findMany({
    where: {
      developerId: { in: developerIds },
      periodMonth: month,
      periodYear:  year,
    },
  });
}

// Aplica filtros sobre as linhas já construídas (pós-agrupamento)
function applyFilters(
  rows: DapDeveloperRow[],
  filters: DapClosingFilters,
): DapDeveloperRow[] {
  return rows
    .map((row) => {
      // Filtro por desenvolvedor
      if (filters.developerId && row.developerId !== filters.developerId) return null;

      // Filtro por status da assinatura
      if (filters.statementStatus) {
        const effective = row.statementStatus ?? null;
        if (filters.statementStatus === "NONE") {
          if (effective !== null) return null;
        } else {
          if (effective !== filters.statementStatus) return null;
        }
      }

      // Filtro por perfil do dev
      if (filters.workerProfile && row.developerProfile !== filters.workerProfile) return null;

      // Filtro nos itens de demanda
      let demands = row.demands;
      if (filters.requesterArea) {
        demands = demands.filter((d) => d.requesterArea === filters.requesterArea);
      }
      if (filters.demandType) {
        demands = demands.filter((d) => d.demandType === filters.demandType);
      }
      if (filters.complexity) {
        demands = demands.filter((d) => d.complexity === filters.complexity);
      }
      if (filters.roi) {
        demands = demands.filter((d) => d.roi === filters.roi);
      }

      if (demands.length === 0) return null;

      return {
        ...row,
        demands,
        totalDemands:        demands.length,
        totalEstimatedHours: demands.reduce((s, d) => s + d.estimatedHours, 0),
        totalEstimatedValue: demands.reduce((s, d) => s + d.estimatedValue, 0),
      };
    })
    .filter((r): r is DapDeveloperRow => r !== null);
}

function buildPreview(
  rows: DapDeveloperRow[],
  month: number,
  year: number,
): DapClosingPreview {
  const totalDemands        = rows.reduce((s, r) => s + r.totalDemands, 0);
  const totalEstimatedHours = rows.reduce((s, r) => s + r.totalEstimatedHours, 0);
  const totalEstimatedValue = rows.reduce((s, r) => s + r.totalEstimatedValue, 0);

  const signedCount   = rows.filter((r) => r.statementStatus === "SIGNED").length;
  const exportedCount = rows.filter((r) => r.statementStatus === "EXPORTED").length;
  const pendingCount  = rows.length - signedCount - exportedCount;

  const signaturePercentage = rows.length > 0
    ? Math.round(((signedCount + exportedCount) / rows.length) * 100)
    : 0;

  return {
    periodMonth: month,
    periodYear:  year,
    totalDevs:   rows.length,
    totalDemands,
    totalEstimatedHours,
    totalEstimatedValue,
    signedCount,
    exportedCount,
    pendingCount,
    signaturePercentage,
    developers: rows,
  };
}

// ── Service público ───────────────────────────────────────────────

export const dapClosingService = {
  /** Retorna o preview completo do fechamento para o período. */
  async getClosingPreview(
    month: number,
    year: number,
    filters: DapClosingFilters = {},
  ): Promise<DapClosingPreview> {
    const demands  = await fetchDemandsForPeriod(month, year);
    if (demands.length === 0) {
      return {
        periodMonth: month, periodYear: year,
        totalDevs: 0, totalDemands: 0,
        totalEstimatedHours: 0, totalEstimatedValue: 0,
        signedCount: 0, exportedCount: 0, pendingCount: 0,
        signaturePercentage: 0, developers: [],
      };
    }

    // Agrupa por DEV
    const byDev = new Map<string, typeof demands>();
    for (const d of demands) {
      if (!d.assigneeId || !d.assignee) continue;
      const existing = byDev.get(d.assigneeId) ?? [];
      existing.push(d);
      byDev.set(d.assigneeId, existing);
    }

    const devIds     = Array.from(byDev.keys());
    const statements = await fetchStatementsForPeriod(devIds, month, year);
    const stmtByDev  = new Map(statements.map((s) => [s.developerId, s]));

    // Constrói linhas por DEV
    const rows: DapDeveloperRow[] = devIds.map((devId) => {
      const devDemands = byDev.get(devId)!;
      const dev        = devDemands[0].assignee!;
      const stmt       = stmtByDev.get(devId) ?? null;

      const demandRows: DapDemandRow[] = devDemands.map((d) => ({
        demandId:               d.id,
        demandCode:             d.id.slice(-6).toUpperCase(),
        demandTitle:            d.title,
        requesterArea:          d.requesterArea,
        demandType:             d.demandType,
        complexity:             d.complexity,
        roi:                    d.roi,
        estimatedHours:         d.estimatedHours ?? 0,
        hourlyRate:             d.hourlyRateSnapshot !== null ? Number(d.hourlyRateSnapshot) : null,
        estimatedValue:         d.estimatedDemandValue ?? 0,
        homologationDate:       d.homologationDate?.toISOString() ?? null,
        assigneeProfileSnapshot: d.assigneeProfileSnapshot ?? dev.workerProfile ?? null,
        directorPriorityOrder:  d.directorPriorityOrder,
        plannedDeliveryDate:    d.plannedDeliveryDate?.toISOString() ?? null,
        actualDeliveryDate:     d.actualDeliveryDate?.toISOString() ?? null,
      }));

      return {
        developerId:      dev.id,
        developerName:    dev.name,
        developerEmail:   dev.email,
        developerProfile: dev.workerProfile,
        totalDemands:        demandRows.length,
        totalEstimatedHours: demandRows.reduce((s, d) => s + d.estimatedHours, 0),
        totalEstimatedValue: demandRows.reduce((s, d) => s + d.estimatedValue, 0),
        statementId:      stmt?.id ?? null,
        statementStatus:  (stmt?.status ?? null) as StatementStatus | null,
        signatureCode:    stmt?.signatureCode ?? null,
        signedAt:         stmt?.signedAt?.toISOString() ?? null,
        signatureIp:      stmt?.signatureIp ?? null,
        signatureUserAgent: stmt?.signatureUserAgent ?? null,
        contentHash:      stmt?.contentHash ?? null,
        demands:          demandRows,
      };
    });

    const filtered = applyFilters(rows, filters);
    return buildPreview(filtered, month, year);
  },

  /** Gera o CSV completo das variáveis do período para download. */
  async exportPeriodVariables(
    month: number,
    year: number,
    filters: DapClosingFilters = {},
    actorId: string,
    meta: { ip: string; userAgent: string },
  ): Promise<{ content: string; filename: string }> {
    const preview = await this.getClosingPreview(month, year, filters);

    const mm  = String(month).padStart(2, "0");
    const yy  = year;

    // ── Cabeçalho CSV ──────────────────────────────────────────────
    const HEADERS = [
      "periodoMes", "periodoAno",
      "developerName", "developerEmail", "developerProfile",
      "demandId", "demandCode", "demandTitle",
      "requesterArea", "demandType", "complexity", "roi",
      "estimatedHours", "hourlyRate", "estimatedDemandValue",
      "homologationDate",
      "directorPriorityOrder",
      "plannedDeliveryDate", "actualDeliveryDate",
      "statementStatus", "statementId",
      "signatureCode", "signedAt", "signatureIp", "signatureUserAgent",
      "contentHash",
    ];

    const rows: string[] = [];
    rows.push(HEADERS.map(esc).join(SEP));

    // ── Linhas: uma por demanda ─────────────────────────────────────
    for (const dev of preview.developers) {
      const stmtStatus = dev.statementStatus ?? "PENDING";
      for (const d of dev.demands) {
        rows.push([
          esc(String(month)),
          esc(String(yy)),
          esc(dev.developerName),
          esc(dev.developerEmail),
          esc(dev.developerProfile),
          esc(d.demandCode),
          esc(d.demandCode),
          esc(d.demandTitle),
          esc(d.requesterArea),
          esc(d.demandType),
          esc(d.complexity),
          esc(d.roi),
          esc(fmtDecimal(d.estimatedHours)),
          esc(fmtDecimal(d.hourlyRate)),
          esc(fmtDecimal(d.estimatedValue)),
          esc(fmtDate(d.homologationDate)),
          esc(d.directorPriorityOrder !== null ? String(d.directorPriorityOrder) : ""),
          esc(fmtDate(d.plannedDeliveryDate)),
          esc(fmtDate(d.actualDeliveryDate)),
          esc(stmtStatus),
          esc(dev.statementId),
          esc(dev.signatureCode),
          esc(fmtDateTime(dev.signedAt)),
          esc(dev.signatureIp),
          esc(dev.signatureUserAgent),
          esc(dev.contentHash),
        ].join(SEP));
      }
    }

    const content = BOM + rows.join(CRLF);

    // ── Auditoria ──────────────────────────────────────────────────
    await auditService.log({
      entity:   "DapClosing",
      entityId: `${yy}-${mm}`,
      action:   "DAP_PERIOD_EXPORTED",
      newValue: {
        month, year,
        filters,
        totalDemands:  preview.totalDemands,
        totalDevs:     preview.totalDevs,
        signedCount:   preview.signedCount,
        pendingCount:  preview.pendingCount,
        exportedBy:    actorId,
        exportIp:      meta.ip,
        exportedAt:    new Date().toISOString(),
      },
      userId: actorId,
    });

    return { content, filename: `variaveis-dap-${mm}-${yy}.csv` };
  },

  /** Busca o extrato de um DEV para exibição no painel DAP. */
  async getDeveloperStatementForPeriod(
    developerId: string,
    month: number,
    year: number,
  ) {
    return prisma.developerMonthlyStatement.findUnique({
      where: {
        developerId_periodMonth_periodYear: { developerId, periodMonth: month, periodYear: year },
      },
      include: {
        developer: { select: { id: true, name: true, email: true, workerProfile: true } },
        items: { orderBy: { homologationDate: "asc" } },
      },
    });
  },
};
