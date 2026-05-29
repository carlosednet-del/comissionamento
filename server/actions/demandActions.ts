"use server";

import { revalidatePath }  from "next/cache";
import { requireAuth }     from "@/server/auth/helpers";
import { toPermissionUser } from "@/server/auth/helpers";
import { demandService }          from "@/services/demandService";
import { demandWorkflowService }  from "@/services/demandWorkflowService";
import type { ActionResult, DemandFilters } from "@/types";
import type {
  CreateDemandInput,
  UpdateDemandInput,
  ChangeDemandStatusInput,
  SendToHomologationInput,
  HomologateDemandInput,
  RejectDemandInput,
  CancelDemandInput,
} from "@/validations/demand";
import type { CreateEvidenceInput } from "@/validations/evidence";

function handleError(e: unknown): ActionResult<never> {
  if (e instanceof Error) return { success: false, error: e.message };
  return { success: false, error: "Erro desconhecido" };
}

// ── Create ───────────────────────────────────────────────────────

export async function createDemandAction(
  input: Omit<CreateDemandInput, "creatorId">,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireAuth();
    const actor   = toPermissionUser(session);
    const demand  = await demandService.createDemand(
      { ...input, creatorId: session.id },
      actor,
    );
    revalidatePath("/demandas");
    return { success: true, data: { id: demand.id } };
  } catch (e) {
    return handleError(e);
  }
}

// ── Update ───────────────────────────────────────────────────────

export async function updateDemandAction(
  id: string,
  input: UpdateDemandInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireAuth();
    const actor   = toPermissionUser(session);
    await demandService.updateDemand(id, input, actor);
    revalidatePath("/demandas");
    revalidatePath(`/demandas/${id}`);
    return { success: true, data: { id } };
  } catch (e) {
    return handleError(e);
  }
}

// ── List ─────────────────────────────────────────────────────────

export async function listDemandsAction(filters?: DemandFilters) {
  await requireAuth();
  return demandService.listDemands(filters);
}

// ── Get by ID ────────────────────────────────────────────────────

export async function getDemandAction(id: string) {
  const session = await requireAuth();
  const actor   = toPermissionUser(session);
  return demandService.getById(id, actor);
}

// ── Change status ────────────────────────────────────────────────

export async function changeDemandStatusAction(
  id: string,
  input: ChangeDemandStatusInput,
): Promise<ActionResult<void>> {
  try {
    const session = await requireAuth();
    const actor   = toPermissionUser(session);
    await demandService.changeStatus(id, input, actor);
    revalidatePath("/demandas");
    revalidatePath(`/demandas/${id}`);
    return { success: true, data: undefined };
  } catch (e) {
    return handleError(e);
  }
}

// ── Evidence ─────────────────────────────────────────────────────

export async function attachEvidenceAction(
  input: Omit<CreateEvidenceInput, "createdById">,
): Promise<ActionResult<void>> {
  try {
    const session = await requireAuth();
    const actor   = toPermissionUser(session);
    await demandService.addEvidence(input, actor);
    revalidatePath(`/demandas/${input.demandId}`);
    return { success: true, data: undefined };
  } catch (e) {
    return handleError(e);
  }
}

// ── Audit ────────────────────────────────────────────────────────

export async function getDemandAuditLogsAction(demandId: string) {
  await requireAuth();
  return demandService.getAuditLogs(demandId);
}

// ── Stats ────────────────────────────────────────────────────────

export async function getDemandStatsAction() {
  await requireAuth();
  return demandService.getStats();
}

// ── Workflow ─────────────────────────────────────────────────────

function revalidateDemand(id: string) {
  revalidatePath("/demandas");
  revalidatePath(`/demandas/${id}`);
}

export async function openDemandAction(id: string): Promise<ActionResult<void>> {
  try {
    const session = await requireAuth();
    await demandWorkflowService.openDemand(id, toPermissionUser(session));
    revalidateDemand(id);
    return { success: true, data: undefined };
  } catch (e) { return handleError(e); }
}

export async function sendToAnalysisAction(id: string): Promise<ActionResult<void>> {
  try {
    const session = await requireAuth();
    await demandWorkflowService.sendToAnalysis(id, toPermissionUser(session));
    revalidateDemand(id);
    return { success: true, data: undefined };
  } catch (e) { return handleError(e); }
}

export async function approveDemandAction(id: string): Promise<ActionResult<void>> {
  try {
    const session = await requireAuth();
    await demandWorkflowService.approveDemand(id, toPermissionUser(session));
    revalidateDemand(id);
    return { success: true, data: undefined };
  } catch (e) { return handleError(e); }
}

export async function startDevelopmentAction(id: string): Promise<ActionResult<void>> {
  try {
    const session = await requireAuth();
    await demandWorkflowService.startDevelopment(id, toPermissionUser(session));
    revalidateDemand(id);
    return { success: true, data: undefined };
  } catch (e) { return handleError(e); }
}

export async function sendToHomologationAction(
  id: string,
  input: SendToHomologationInput,
): Promise<ActionResult<void>> {
  try {
    const session = await requireAuth();
    await demandWorkflowService.sendToHomologation(id, input, toPermissionUser(session));
    revalidateDemand(id);
    return { success: true, data: undefined };
  } catch (e) { return handleError(e); }
}

export async function homologateDemandAction(
  id: string,
  input: HomologateDemandInput,
): Promise<ActionResult<void>> {
  try {
    const session = await requireAuth();
    await demandWorkflowService.homologateDemand(id, input, toPermissionUser(session));
    revalidateDemand(id);
    return { success: true, data: undefined };
  } catch (e) { return handleError(e); }
}

export async function rejectDemandAction(
  id: string,
  input: RejectDemandInput,
): Promise<ActionResult<void>> {
  try {
    const session = await requireAuth();
    await demandWorkflowService.rejectDemand(id, input, toPermissionUser(session));
    revalidateDemand(id);
    return { success: true, data: undefined };
  } catch (e) { return handleError(e); }
}

export async function returnToDevelopmentAction(id: string): Promise<ActionResult<void>> {
  try {
    const session = await requireAuth();
    await demandWorkflowService.returnToDevelopment(id, toPermissionUser(session));
    revalidateDemand(id);
    return { success: true, data: undefined };
  } catch (e) { return handleError(e); }
}

export async function cancelDemandAction(
  id: string,
  input: CancelDemandInput,
): Promise<ActionResult<void>> {
  try {
    const session = await requireAuth();
    await demandWorkflowService.cancelDemand(id, input, toPermissionUser(session));
    revalidateDemand(id);
    return { success: true, data: undefined };
  } catch (e) { return handleError(e); }
}

// ── Delete ───────────────────────────────────────────────────────

export async function deleteDemandAction(id: string): Promise<ActionResult<void>> {
  try {
    const session = await requireAuth();
    await demandService.deleteDemand(id, toPermissionUser(session));
    revalidatePath("/demandas");
    revalidatePath("/demandas/kanban");
    return { success: true, data: undefined };
  } catch (e) { return handleError(e); }
}
