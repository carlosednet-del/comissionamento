"use server";

import { requireAuth, toPermissionUser } from "@/server/auth/helpers";
import { canViewMyStatement, canSignStatement, canExportStatement } from "@/server/auth/permissions";
import { monthlyStatementService } from "@/services/monthlyStatementService";
import { getRequestMetadata }       from "@/lib/statement/getRequestMetadata";
import { prisma }                   from "@/lib/prisma";
import type { ActionResult, StatementData } from "@/types";

// ── Validação de período ──────────────────────────────────────────

function validatePeriod(month: number, year: number): string | null {
  if (!Number.isInteger(month) || month < 1 || month > 12) return "Mês inválido.";
  if (!Number.isInteger(year)  || year < 2020 || year > 2099) return "Ano inválido.";
  return null;
}

// ── Actions ───────────────────────────────────────────────────────

export async function getMyStatementAction(
  month: number,
  year:  number,
): Promise<ActionResult<StatementData>> {
  try {
    const session = await requireAuth();
    const actor   = toPermissionUser(session);

    if (!canViewMyStatement(actor)) {
      return { success: false, error: "Sem permissão para acessar extratos." };
    }

    const periodError = validatePeriod(month, year);
    if (periodError) return { success: false, error: periodError };

    const data = await monthlyStatementService.getMyStatement(actor.id, month, year);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erro desconhecido." };
  }
}

export async function signMyStatementAction(
  month: number,
  year:  number,
): Promise<ActionResult<{ signatureCode: string; signedAt: string; statementId: string }>> {
  try {
    const session = await requireAuth();
    const actor   = toPermissionUser(session);

    if (!canViewMyStatement(actor)) {
      return { success: false, error: "Sem permissão para acessar extratos." };
    }

    const periodError = validatePeriod(month, year);
    if (periodError) return { success: false, error: periodError };

    // Apenas o próprio DEV pode assinar
    const fakeStatement = { developerId: actor.id };
    if (!canSignStatement(actor, fakeStatement)) {
      return { success: false, error: "Apenas DEVs podem assinar o próprio extrato. ADMIN e DIRETOR não assinam em nome do DEV." };
    }

    const meta   = await getRequestMetadata();
    const result = await monthlyStatementService.signStatement(actor.id, month, year, meta);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erro desconhecido." };
  }
}

export async function exportMyStatementAction(
  statementId: string,
): Promise<ActionResult<{ content: string; filename: string }>> {
  try {
    const session = await requireAuth();
    const actor   = toPermissionUser(session);

    if (!canViewMyStatement(actor)) {
      return { success: false, error: "Sem permissão para exportar extratos." };
    }

    // Verifica ownership do statement
    const stmt = await prisma.developerMonthlyStatement.findUnique({
      where:  { id: statementId },
      select: { developerId: true },
    });
    if (!stmt) return { success: false, error: "Extrato não encontrado." };

    if (!canExportStatement(actor, stmt)) {
      return { success: false, error: "Sem permissão para exportar este extrato." };
    }

    const result = await monthlyStatementService.exportSignedStatement(statementId, actor.id);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erro desconhecido." };
  }
}

/**
 * Registra a exportação em PDF. O arquivo é renderizado no cliente (jsPDF) a
 * partir dos dados já carregados; esta action aplica as mesmas checagens de
 * permissão do CSV e mantém o rastro de auditoria do documento assinado.
 */
export async function registerPdfExportAction(
  statementId: string,
): Promise<ActionResult<null>> {
  try {
    const session = await requireAuth();
    const actor   = toPermissionUser(session);

    if (!canViewMyStatement(actor)) {
      return { success: false, error: "Sem permissão para exportar extratos." };
    }

    const stmt = await prisma.developerMonthlyStatement.findUnique({
      where:  { id: statementId },
      select: { developerId: true },
    });
    if (!stmt) return { success: false, error: "Extrato não encontrado." };

    if (!canExportStatement(actor, stmt)) {
      return { success: false, error: "Sem permissão para exportar este extrato." };
    }

    await monthlyStatementService.registerStatementExport(statementId, actor.id, "pdf");
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erro desconhecido." };
  }
}
