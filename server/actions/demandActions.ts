"use server";

import { revalidatePath }  from "next/cache";
import { requireAuth }     from "@/server/auth/helpers";
import { toPermissionUser } from "@/server/auth/helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma }                 from "@/lib/prisma";
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
  StartDevelopmentInput,
  SendToAnalysisInput,
} from "@/validations/demand";
import type { CreateEvidenceInput } from "@/validations/evidence";
import {
  InvalidStatusTransitionError,
  DemandPermissionError,
  DemandNotFoundError,
} from "@/services/demandService";

function handleError(e: unknown): ActionResult<never> {
  if (e instanceof InvalidStatusTransitionError) {
    return { success: false, error: "Transição de status não permitida. Atualize a página e tente novamente." };
  }
  if (e instanceof DemandPermissionError) {
    return { success: false, error: "Você não tem permissão para realizar esta operação." };
  }
  if (e instanceof DemandNotFoundError) {
    return { success: false, error: "Demanda não encontrada." };
  }
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

// ── Evidence image upload ─────────────────────────────────────────

const EVIDENCE_BUCKET = "evidence-images";
const MAX_IMAGE_SIZE  = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES   = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];

export async function uploadEvidenceImageAction(
  formData: FormData,
): Promise<ActionResult<{ url: string }>> {
  try {
    const session = await requireAuth();

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { success: false, error: "Nenhum arquivo enviado" };
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { success: false, error: "Formato inválido. Use JPG, PNG, GIF, WebP ou SVG." };
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return { success: false, error: "Imagem deve ter no máximo 5 MB." };
    }

    const supabase = createAdminClient();

    // Garante que o bucket exista (idempotente)
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === EVIDENCE_BUCKET);
    if (!bucketExists) {
      const { error: createErr } = await supabase.storage.createBucket(EVIDENCE_BUCKET, {
        public: true,
        fileSizeLimit: MAX_IMAGE_SIZE,
        allowedMimeTypes: ALLOWED_TYPES,
      });
      if (createErr) throw new Error(`Falha ao criar bucket: ${createErr.message}`);
    }

    const ext      = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const filename = `${session.id}/${Date.now()}.${ext}`;
    const bytes    = await file.arrayBuffer();
    const buffer   = Buffer.from(bytes);

    const { error: uploadErr } = await supabase.storage
      .from(EVIDENCE_BUCKET)
      .upload(filename, buffer, { contentType: file.type, upsert: false });

    if (uploadErr) throw new Error(`Falha no upload: ${uploadErr.message}`);

    const { data: { publicUrl } } = supabase.storage
      .from(EVIDENCE_BUCKET)
      .getPublicUrl(filename);

    return { success: true, data: { url: publicUrl } };
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
  revalidatePath("/demandas/kanban");
}

export async function openDemandAction(id: string): Promise<ActionResult<void>> {
  try {
    const session = await requireAuth();
    await demandWorkflowService.openDemand(id, toPermissionUser(session));
    revalidateDemand(id);
    return { success: true, data: undefined };
  } catch (e) { return handleError(e); }
}

export async function returnToOpenAction(id: string): Promise<ActionResult<void>> {
  try {
    const session = await requireAuth();
    await demandWorkflowService.returnToOpen(id, toPermissionUser(session));
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

export async function sendToAnalysisWithDataAction(
  id: string,
  input: SendToAnalysisInput,
): Promise<ActionResult<void>> {
  try {
    const session = await requireAuth();
    const actor   = toPermissionUser(session);
    // Salva os campos técnicos (pricing recalculado pelo service)
    await demandService.updateDemand(id, {
      assigneeId:     input.assigneeId,
      estimatedHours: input.estimatedHours,
      complexity:     input.complexity,
      roi:            input.roi,
    }, actor);
    // Transiciona status para EM_ANALISE
    await demandWorkflowService.sendToAnalysis(id, actor);
    revalidateDemand(id);
    return { success: true, data: undefined };
  } catch (e) { return handleError(e); }
}

export async function getAssigneesAction() {
  await requireAuth();
  return prisma.user.findMany({
    where:   { isActive: true, role: { in: ["DEV", "GESTOR", "ARQUITETO", "SUPORTE", "ADMIN"] } },
    select:  { id: true, name: true, workerProfile: true, role: true },
    orderBy: { name: "asc" },
  });
}

export async function approveDemandAction(id: string): Promise<ActionResult<void>> {
  try {
    const session = await requireAuth();
    await demandWorkflowService.approveDemand(id, toPermissionUser(session));
    revalidateDemand(id);
    return { success: true, data: undefined };
  } catch (e) { return handleError(e); }
}

export async function startDevelopmentAction(
  id: string,
  input: StartDevelopmentInput,
): Promise<ActionResult<void>> {
  try {
    const session = await requireAuth();
    await demandWorkflowService.startDevelopment(id, input, toPermissionUser(session));
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

export async function sendToDirectorPrioritizationAction(id: string): Promise<ActionResult<void>> {
  try {
    const session = await requireAuth();
    await demandWorkflowService.sendToDirectorPrioritization(id, toPermissionUser(session));
    revalidateDemand(id);
    return { success: true, data: undefined };
  } catch (e) { return handleError(e); }
}

export async function prioritizeAndApproveAction(
  id: string,
  opts: { directorPriorityOrder: number; prioritizationNotes?: string },
): Promise<ActionResult<void>> {
  try {
    const session = await requireAuth();
    await demandWorkflowService.prioritizeAndApproveDemand(id, toPermissionUser(session), opts);
    revalidateDemand(id);
    return { success: true, data: undefined };
  } catch (e) { return handleError(e); }
}

export async function returnFromDirectorPrioritizationAction(
  id: string,
  reason: string,
): Promise<ActionResult<void>> {
  try {
    const session = await requireAuth();
    await demandWorkflowService.returnFromDirectorPrioritization(id, toPermissionUser(session), reason);
    revalidateDemand(id);
    return { success: true, data: undefined };
  } catch (e) { return handleError(e); }
}

export async function returnApprovedToAnalysisAction(
  id: string,
  reason: string,
): Promise<ActionResult<void>> {
  try {
    const session = await requireAuth();
    await demandWorkflowService.returnApprovedToAnalysis(id, toPermissionUser(session), reason);
    revalidateDemand(id);
    return { success: true, data: undefined };
  } catch (e) { return handleError(e); }
}

// ── Toggle Pedra ─────────────────────────────────────────────────

export async function togglePedraAction(
  id: string,
  value: boolean,
): Promise<ActionResult<void>> {
  try {
    const session = await requireAuth();
    const actor   = toPermissionUser(session);
    if (actor.role !== "ADMIN" && actor.role !== "GESTOR") {
      return { success: false, error: "Sem permissão para marcar demanda como Pedra." };
    }
    await demandService.updateDemand(id, { isPedra: value }, actor);
    revalidatePath("/demandas/kanban");
    revalidatePath(`/demandas/${id}`);
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
