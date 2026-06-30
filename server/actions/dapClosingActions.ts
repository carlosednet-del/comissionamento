"use server";

import { requireAuth, toPermissionUser } from "@/server/auth/helpers";
import {
  canAccessDapClosing,
  canExportDapVariables,
} from "@/server/auth/permissions";
import { dapClosingService } from "@/services/dapClosingService";
import { getRequestMetadata }  from "@/lib/statement/getRequestMetadata";
import { auditService }        from "@/services/auditService";
import type { ActionResult, DapClosingFilters, DapClosingPreview } from "@/types";

// ── Validação ─────────────────────────────────────────────────────

function validatePeriod(month: number, year: number): string | null {
  if (!Number.isInteger(month) || month < 1 || month > 12) return "Mês inválido.";
  if (!Number.isInteger(year)  || year < 2020 || year > 2099) return "Ano inválido.";
  return null;
}

function sanitizeFilters(raw: Partial<DapClosingFilters>): DapClosingFilters {
  const f: DapClosingFilters = {};
  if (typeof raw.developerId    === "string" && raw.developerId)    f.developerId    = raw.developerId;
  if (typeof raw.statementStatus === "string" && raw.statementStatus) f.statementStatus = raw.statementStatus as DapClosingFilters["statementStatus"];
  if (typeof raw.requesterArea  === "string" && raw.requesterArea)  f.requesterArea  = raw.requesterArea;
  if (typeof raw.workerProfile  === "string" && raw.workerProfile)  f.workerProfile  = raw.workerProfile;
  if (typeof raw.demandType     === "string" && raw.demandType)     f.demandType     = raw.demandType;
  if (typeof raw.complexity     === "string" && raw.complexity)     f.complexity     = raw.complexity;
  if (typeof raw.roi            === "string" && raw.roi)            f.roi            = raw.roi;
  return f;
}

// ── Actions ───────────────────────────────────────────────────────

export async function getDapClosingPreviewAction(
  month: number,
  year: number,
  rawFilters: Partial<DapClosingFilters> = {},
): Promise<ActionResult<DapClosingPreview>> {
  try {
    const session = await requireAuth();
    const actor   = toPermissionUser(session);

    if (!canAccessDapClosing(actor)) {
      return { success: false, error: "Sem permissão para acessar o fechamento DAP." };
    }

    const periodError = validatePeriod(month, year);
    if (periodError) return { success: false, error: periodError };

    const filters = sanitizeFilters(rawFilters);
    const data    = await dapClosingService.getClosingPreview(month, year, filters);

    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erro desconhecido." };
  }
}

export async function exportDapPeriodVariablesAction(
  month: number,
  year: number,
  rawFilters: Partial<DapClosingFilters> = {},
): Promise<ActionResult<{ content: string; filename: string }>> {
  try {
    const session = await requireAuth();
    const actor   = toPermissionUser(session);

    if (!canExportDapVariables(actor)) {
      return { success: false, error: "Sem permissão para exportar variáveis DAP." };
    }

    const periodError = validatePeriod(month, year);
    if (periodError) return { success: false, error: periodError };

    const filters = sanitizeFilters(rawFilters);
    const meta    = await getRequestMetadata();
    const result  = await dapClosingService.exportPeriodVariables(month, year, filters, actor.id, meta);

    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erro desconhecido." };
  }
}

export async function exportDapDeveloperStatementAction(
  statementId: string,
): Promise<ActionResult<{ content: string; filename: string }>> {
  try {
    const session = await requireAuth();
    const actor   = toPermissionUser(session);

    if (!canAccessDapClosing(actor)) {
      return { success: false, error: "Sem permissão para exportar extratos." };
    }

    // Reutiliza o service do Módulo 1
    const { monthlyStatementService } = await import("@/services/monthlyStatementService");
    const result = await monthlyStatementService.exportSignedStatement(statementId, actor.id);

    // Auditoria específica DAP
    await auditService.log({
      entity:   "DeveloperMonthlyStatement",
      entityId: statementId,
      action:   "DAP_DEVELOPER_STATEMENT_EXPORTED",
      newValue: { statementId, exportedBy: actor.id, role: actor.role },
      userId:   actor.id,
    });

    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erro desconhecido." };
  }
}
