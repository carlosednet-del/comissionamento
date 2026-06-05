"use server";

import { prisma }    from "@/lib/prisma";
import { requireAuth } from "@/server/auth/helpers";
import type { ActionResult } from "@/types";

// ── Tipos públicos ─────────────────────────────────────────────────

export type StatementDemand = {
  id:                   string;
  title:                string;
  status:               string;
  estimatedHours:       number | null;
  estimatedDemandValue: number | null;
  approvedAt:           string | null; // ISO string — seguro para serializar
  homologationDate:     string | null;
  plannedDeliveryDate:  string | null;
};

export type CollaboratorStatementData = {
  approvedDemands:    StatementDemand[];
  homologatedDemands: StatementDemand[];
};

// ── Action ─────────────────────────────────────────────────────────

export async function getCollaboratorStatementAction(
  assigneeId: string,
  month:      number,
  year:       number,
): Promise<ActionResult<CollaboratorStatementData>> {
  try {
    await requireAuth();

    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end   = new Date(year, month,     0, 23, 59, 59, 999);

    const select = {
      id:                   true,
      title:                true,
      status:               true,
      estimatedHours:       true,
      estimatedDemandValue: true,
      approvedAt:           true,
      homologationDate:     true,
      plannedDeliveryDate:  true,
    } as const;

    const [approvedRaw, homologatedRaw] = await Promise.all([
      prisma.demand.findMany({
        where:   { assigneeId, approvedAt: { gte: start, lte: end } },
        select,
        orderBy: { approvedAt: "asc" },
      }),
      prisma.demand.findMany({
        where:   { assigneeId, homologationDate: { gte: start, lte: end } },
        select,
        orderBy: { homologationDate: "asc" },
      }),
    ]);

    const toStatement = (d: typeof approvedRaw[number]): StatementDemand => ({
      id:                   d.id,
      title:                d.title,
      status:               d.status,
      estimatedHours:       d.estimatedHours,
      estimatedDemandValue: d.estimatedDemandValue,
      approvedAt:           d.approvedAt?.toISOString() ?? null,
      homologationDate:     d.homologationDate?.toISOString() ?? null,
      plannedDeliveryDate:  d.plannedDeliveryDate?.toISOString() ?? null,
    });

    return {
      success: true,
      data: {
        approvedDemands:    approvedRaw.map(toStatement),
        homologatedDemands: homologatedRaw.map(toStatement),
      },
    };
  } catch (e) {
    if (e instanceof Error) return { success: false, error: e.message };
    return { success: false, error: "Erro ao carregar extrato" };
  }
}
