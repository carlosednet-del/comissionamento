"use server";

import { requireAuth, toPermissionUser } from "@/server/auth/helpers";
import { canViewExecutiveDashboard } from "@/server/auth/permissions";
import { executiveDashboardService } from "@/services/executiveDashboardService";
import { executiveDashboardFiltersSchema } from "@/validations/executive-dashboard";
import {
  getExecDashboardDirectors,
  getExecDashboardCollaborators,
} from "@/repositories/executiveDashboardRepository";
import { auditService } from "@/services/auditService";
import { getRequestMetadata } from "@/lib/statement/getRequestMetadata";
import type { ActionResult } from "@/types";
import type { ExecDashboardData } from "@/services/executiveDashboardService";
import type { ExecutiveDashboardFilters } from "@/validations/executive-dashboard";
import { ZodError } from "zod";

function forbidden(): ActionResult<never> {
  return { success: false, error: "Você não tem permissão para acessar o Dashboard Executivo." };
}

export async function getExecDashboardDataAction(
  rawFilters: ExecutiveDashboardFilters,
): Promise<ActionResult<ExecDashboardData>> {
  try {
    const session = await requireAuth();
    const actor   = toPermissionUser(session);

    if (!canViewExecutiveDashboard(actor)) return forbidden();

    const filters = executiveDashboardFiltersSchema.parse(rawFilters);
    const data    = await executiveDashboardService.getData(filters);

    return { success: true, data };
  } catch (e) {
    if (e instanceof ZodError) return { success: false, error: "Filtros inválidos." };
    if (e instanceof Error)   return { success: false, error: e.message };
    return { success: false, error: "Erro ao carregar dashboard executivo." };
  }
}

export async function exportExecDashboardAction(
  rawFilters: ExecutiveDashboardFilters,
): Promise<ActionResult<{ csv: string; filename: string }>> {
  try {
    const session = await requireAuth();
    const actor   = toPermissionUser(session);

    if (!canViewExecutiveDashboard(actor)) return forbidden();

    const filters = executiveDashboardFiltersSchema.parse(rawFilters);
    const data    = await executiveDashboardService.getData(filters);

    const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
    const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

    const headers = [
      "ID", "Título", "Data Homologação", "Área", "Colaborador", "Perfil",
      "Diretor", "Tipo", "Complexidade", "ROI",
      "Horas Est.", "Valor Interno", "Benchmark Mercado", "Economia", "Economia %",
    ];

    const rows = data.demands.map((d) => [
      d.id,
      `"${d.title.replace(/"/g, '""')}"`,
      d.homologationDate ? new Date(d.homologationDate).toLocaleDateString("pt-BR") : "",
      d.requesterArea,
      d.assigneeName ?? "",
      d.assigneeProfile ?? "",
      d.directorName ?? "",
      d.demandType,
      d.complexity ?? "",
      d.roi ?? "",
      d.estimatedHours.toFixed(1),
      BRL.format(d.estimatedDemandValue),
      BRL.format(d.benchmarkValue),
      BRL.format(d.economy),
      pct(d.economyPercent),
    ]);

    const csv      = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const date     = new Date().toISOString().slice(0, 10);
    const filename = `dashboard-executivo-${date}.csv`;

    const meta = await getRequestMetadata();
    await auditService.log({
      entity:   "ExecutiveDashboard",
      entityId: "export",
      action:   "EXECUTIVE_DASHBOARD_EXPORTED",
      newValue: { filters, records: data.demands.length, ip: meta.ip, userAgent: meta.userAgent },
      userId:   session.id,
    });

    return { success: true, data: { csv, filename } };
  } catch (e) {
    if (e instanceof ZodError) return { success: false, error: "Filtros inválidos." };
    if (e instanceof Error)   return { success: false, error: e.message };
    return { success: false, error: "Erro ao exportar dashboard." };
  }
}

export async function getExecDashboardMetaAction() {
  try {
    const session = await requireAuth();
    const actor   = toPermissionUser(session);
    if (!canViewExecutiveDashboard(actor)) return { directors: [], collaborators: [] };

    const [directors, collaborators] = await Promise.all([
      getExecDashboardDirectors(),
      getExecDashboardCollaborators(),
    ]);

    return { directors, collaborators };
  } catch {
    return { directors: [], collaborators: [] };
  }
}
