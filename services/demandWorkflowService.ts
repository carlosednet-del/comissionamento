/**
 * demandWorkflowService — Módulo 4: Workflow de Status
 *
 * Responsável por todas as transições de status da demanda com:
 *  - validação de permissão por actor
 *  - validação de campos obrigatórios por etapa
 *  - atualização de datas automáticas
 *  - registro de auditoria
 *
 * ⚠ NUNCA gera comissão/RV aqui. Apenas marca o status final.
 */

import { prisma }           from "@/lib/prisma";
import { demandRepository } from "@/repositories/demandRepository";
import { auditService }     from "@/services/auditService";
import {
  sendToHomologationSchema,
  homologateDemandSchema,
  rejectDemandSchema,
  cancelDemandSchema,
  type SendToHomologationInput,
  type HomologateDemandInput,
  type RejectDemandInput,
  type CancelDemandInput,
} from "@/validations/demand";
import {
  canChangeDemandStatus,
  canHomologateDemand,
  canCancelDemand,
  canPrioritizeDemand,
} from "@/server/auth/permissions";
import type { UserForPermission } from "@/server/auth/permissions";
import { demandTypeGeneratesValue } from "@/lib/demand-pricing";
import type { DemandStatus }      from "@prisma/client";

// ── Erros de domínio ─────────────────────────────────────────────

export class WorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkflowError";
  }
}

// ── Helpers ──────────────────────────────────────────────────────

async function getDemand(id: string) {
  const demand = await prisma.demand.findUnique({ where: { id } });
  if (!demand) throw new WorkflowError("Demanda não encontrada");
  return demand;
}

function assertTransition(
  actor: UserForPermission,
  demandPerm: { id: string; creatorId: string; assigneeId: string | null; status: DemandStatus },
  target: DemandStatus,
) {
  if (!canChangeDemandStatus(actor, demandPerm, target)) {
    throw new WorkflowError(
      `Você não tem permissão para mover a demanda para o status "${target.replace(/_/g, " ").toLowerCase()}"`,
    );
  }
}

// ── Service ──────────────────────────────────────────────────────

export const demandWorkflowService = {

  // 1. RASCUNHO → ABERTA
  async openDemand(id: string, actor: UserForPermission) {
    const demand = await getDemand(id);
    const demandPerm = { id: demand.id, creatorId: demand.creatorId, assigneeId: demand.assigneeId, status: demand.status };

    if (demand.status !== "RASCUNHO") {
      throw new WorkflowError("Apenas demandas em rascunho podem ser abertas");
    }
    assertTransition(actor, demandPerm, "ABERTA");

    // Validações de campos obrigatórios para demanda aberta
    const missing: string[] = [];
    if (!demand.title?.trim())             missing.push("título");
    if (!demand.description?.trim())       missing.push("descrição");
    if (!demand.assigneeId)                missing.push("responsável técnico");
    if (!demand.estimatedHours)            missing.push("horas estimadas");
    if (!demand.complexity)                missing.push("complexidade");
    if (!demand.roi)                       missing.push("ROI");
    if (!demand.plannedDeliveryDate)       missing.push("data de entrega prevista");
    if (!demand.businessProblem?.trim())   missing.push("critérios de aceite (problema de negócio)");

    if (missing.length > 0) {
      throw new WorkflowError(`Campos obrigatórios ausentes para abrir a demanda: ${missing.join(", ")}`);
    }

    await demandRepository.updateStatus(id, "ABERTA");

    await auditService.log({
      entity:   "Demand",
      entityId: id,
      action:   "STATUS_CHANGE",
      oldValue: { status: demand.status },
      newValue: { status: "ABERTA" },
      userId:   actor.id,
    });
  },

  // 2. ABERTA → EM_ANALISE
  async sendToAnalysis(id: string, actor: UserForPermission) {
    const demand = await getDemand(id);
    const demandPerm = { id: demand.id, creatorId: demand.creatorId, assigneeId: demand.assigneeId, status: demand.status };

    if (demand.status !== "ABERTA") {
      throw new WorkflowError("Apenas demandas abertas podem ser enviadas para análise");
    }
    assertTransition(actor, demandPerm, "EM_ANALISE");

    await demandRepository.updateStatus(id, "EM_ANALISE");

    await auditService.log({
      entity:   "Demand",
      entityId: id,
      action:   "STATUS_CHANGE",
      oldValue: { status: demand.status },
      newValue: { status: "EM_ANALISE" },
      userId:   actor.id,
    });
  },

  // 3a. EM_ANALISE → PRIORIZACAO_DIRETORIA
  async sendToDirectorPrioritization(id: string, actor: UserForPermission) {
    const demand = await getDemand(id);
    const demandPerm = { id: demand.id, creatorId: demand.creatorId, assigneeId: demand.assigneeId, status: demand.status };

    if (demand.status !== "EM_ANALISE") {
      throw new WorkflowError("Apenas demandas em análise podem ser enviadas para priorização da diretoria");
    }
    assertTransition(actor, demandPerm, "PRIORIZACAO_DIRETORIA");

    await demandRepository.updateStatus(id, "PRIORIZACAO_DIRETORIA");

    await auditService.log({
      entity:   "Demand",
      entityId: id,
      action:   "SENT_TO_DIRECTOR_PRIORITIZATION",
      oldValue: { status: demand.status },
      newValue: { status: "PRIORIZACAO_DIRETORIA" },
      userId:   actor.id,
    });
  },

  // 3b. PRIORIZACAO_DIRETORIA → APROVADA
  async prioritizeAndApproveDemand(
    id: string,
    actor: UserForPermission,
    opts: { directorPriorityOrder: number; prioritizationNotes?: string },
  ) {
    const demand = await getDemand(id);

    if (demand.status !== "PRIORIZACAO_DIRETORIA") {
      throw new WorkflowError("Apenas demandas em priorização da diretoria podem ser aprovadas aqui");
    }
    if (!canPrioritizeDemand(actor)) {
      throw new WorkflowError("Apenas ADMIN ou DIRETOR podem priorizar e aprovar demandas");
    }

    const missing: string[] = [];
    if (!demand.assigneeId)          missing.push("responsável técnico");
    if (demandTypeGeneratesValue(demand.demandType) && !demand.estimatedDemandValue) missing.push("valor estimado calculado");
    if (!demand.plannedDeliveryDate) missing.push("prazo combinado");
    if (!demand.businessProblem?.trim()) missing.push("critérios de aceite");
    if (missing.length > 0) {
      throw new WorkflowError(`Campos obrigatórios para aprovação: ${missing.join(", ")}`);
    }

    await demandRepository.updateStatus(id, "APROVADA", {
      approvedAt:           new Date(),
      approvedById:         actor.id,
      prioritizedAt:        new Date(),
      prioritizedById:      actor.id,
      directorPriorityOrder: opts.directorPriorityOrder,
      ...(opts.prioritizationNotes && { prioritizationNotes: opts.prioritizationNotes }),
    });

    await auditService.log({
      entity:   "Demand",
      entityId: id,
      action:   "DEMAND_PRIORITIZED_AND_APPROVED",
      oldValue: { status: demand.status },
      newValue: {
        status:               "APROVADA",
        approvedById:         actor.id,
        directorPriorityOrder: opts.directorPriorityOrder,
        ...(opts.prioritizationNotes && { prioritizationNotes: opts.prioritizationNotes }),
      },
      userId:   actor.id,
    });
  },

  // 3c. PRIORIZACAO_DIRETORIA → EM_ANALISE (devolução)
  async returnFromDirectorPrioritization(id: string, actor: UserForPermission) {
    const demand = await getDemand(id);

    if (demand.status !== "PRIORIZACAO_DIRETORIA") {
      throw new WorkflowError("Apenas demandas em priorização da diretoria podem ser devolvidas para análise");
    }
    if (!canPrioritizeDemand(actor)) {
      throw new WorkflowError("Apenas ADMIN ou DIRETOR podem devolver demandas para análise");
    }

    await demandRepository.updateStatus(id, "EM_ANALISE");

    await auditService.log({
      entity:   "Demand",
      entityId: id,
      action:   "DEMAND_RETURNED_FROM_DIRECTOR_PRIORITIZATION",
      oldValue: { status: demand.status },
      newValue: { status: "EM_ANALISE" },
      userId:   actor.id,
    });
  },

  // 4. PRIORIZACAO_DIRETORIA → APROVADA (via approveDemand - legacy kept for compatibility)
  // 3. (original) EM_ANALISE → APROVADA — agora bloqueado; mantido apenas para ADMIN bypass
  async approveDemand(id: string, actor: UserForPermission) {
    const demand = await getDemand(id);
    const demandPerm = { id: demand.id, creatorId: demand.creatorId, assigneeId: demand.assigneeId, status: demand.status };

    if (demand.status !== "PRIORIZACAO_DIRETORIA") {
      throw new WorkflowError("Apenas demandas em priorização da diretoria podem ser aprovadas");
    }
    assertTransition(actor, demandPerm, "APROVADA");

    // Validações para aprovação
    const missing: string[] = [];
    if (!demand.assigneeId)          missing.push("responsável técnico");
    // Tipos não precificáveis (ex.: correção) não exigem valor estimado
    if (demandTypeGeneratesValue(demand.demandType) && !demand.estimatedDemandValue) missing.push("valor estimado calculado");
    if (!demand.plannedDeliveryDate) missing.push("prazo combinado");
    if (!demand.businessProblem?.trim()) missing.push("critérios de aceite");

    if (missing.length > 0) {
      throw new WorkflowError(`Campos obrigatórios para aprovação: ${missing.join(", ")}`);
    }

    await demandRepository.updateStatus(id, "APROVADA", {
      approvedAt:   new Date(),
      approvedById: actor.id,
    });

    await auditService.log({
      entity:   "Demand",
      entityId: id,
      action:   "APPROVAL",
      oldValue: { status: demand.status },
      newValue: { status: "APROVADA", approvedById: actor.id },
      userId:   actor.id,
    });
  },

  // 4. APROVADA → EM_DESENVOLVIMENTO
  async startDevelopment(id: string, actor: UserForPermission) {
    const demand = await getDemand(id);
    const demandPerm = { id: demand.id, creatorId: demand.creatorId, assigneeId: demand.assigneeId, status: demand.status };

    if (demand.status !== "APROVADA") {
      throw new WorkflowError("Apenas demandas aprovadas podem ser iniciadas");
    }
    assertTransition(actor, demandPerm, "EM_DESENVOLVIMENTO");

    // Preenche actualStartDate se ainda não estiver definida
    const extra: Record<string, unknown> = {};
    if (!demand.actualStartDate) {
      extra.actualStartDate = new Date();
    }

    await demandRepository.updateStatus(id, "EM_DESENVOLVIMENTO", extra);

    await auditService.log({
      entity:   "Demand",
      entityId: id,
      action:   "DEVELOPMENT_STARTED",
      oldValue: { status: demand.status },
      newValue: { status: "EM_DESENVOLVIMENTO", startedById: actor.id },
      userId:   actor.id,
    });
  },

  // 5. EM_DESENVOLVIMENTO → AGUARDANDO_HOMOLOGACAO
  async sendToHomologation(id: string, input: SendToHomologationInput, actor: UserForPermission) {
    const demand = await getDemand(id);
    const demandPerm = { id: demand.id, creatorId: demand.creatorId, assigneeId: demand.assigneeId, status: demand.status };

    if (demand.status !== "EM_DESENVOLVIMENTO") {
      throw new WorkflowError("Apenas demandas em desenvolvimento podem ser enviadas para homologação");
    }
    assertTransition(actor, demandPerm, "AGUARDANDO_HOMOLOGACAO");

    const data = sendToHomologationSchema.parse(input);

    // Pelo menos uma evidência é obrigatória
    const evidenceCount = await prisma.demandEvidence.count({ where: { demandId: id } });
    if (evidenceCount === 0) {
      throw new WorkflowError("Pelo menos uma evidência deve ser cadastrada antes de enviar para homologação");
    }

    await demandRepository.updateStatus(id, "AGUARDANDO_HOMOLOGACAO", {
      actualDeliveryDate: data.actualDeliveryDate,
      ...(data.deliveryNotes && { deliveryNotes: data.deliveryNotes }),
    });

    await auditService.log({
      entity:   "Demand",
      entityId: id,
      action:   "SENT_TO_HOMOLOGATION",
      oldValue: { status: demand.status },
      newValue: {
        status:             "AGUARDANDO_HOMOLOGACAO",
        actualDeliveryDate: data.actualDeliveryDate.toISOString(),
        ...(data.deliveryNotes && { deliveryNotes: data.deliveryNotes }),
      },
      userId:   actor.id,
    });
  },

  // 6. AGUARDANDO_HOMOLOGACAO → HOMOLOGADA_PRODUCAO
  async homologateDemand(id: string, input: HomologateDemandInput, actor: UserForPermission) {
    const demand = await getDemand(id);
    const demandPerm = { id: demand.id, creatorId: demand.creatorId, assigneeId: demand.assigneeId, status: demand.status };

    if (demand.status !== "AGUARDANDO_HOMOLOGACAO") {
      throw new WorkflowError("Apenas demandas aguardando homologação podem ser homologadas");
    }

    if (!canHomologateDemand(actor, demandPerm)) {
      throw new WorkflowError(
        demand.assigneeId === actor.id
          ? "O responsável técnico não pode homologar a própria entrega"
          : "Você não tem permissão para homologar esta demanda",
      );
    }

    // Evidência obrigatória
    const evidenceCount = await prisma.demandEvidence.count({ where: { demandId: id } });
    if (evidenceCount === 0) {
      throw new WorkflowError("É necessário ao menos uma evidência para homologar a demanda");
    }

    const data = homologateDemandSchema.parse(input);

    await demandRepository.updateStatus(id, "HOMOLOGADA_PRODUCAO", {
      homologationDate:   new Date(),
      homologatedById:    actor.id,
      ...(data.homologationNotes && { homologationNotes: data.homologationNotes }),
    });

    await auditService.log({
      entity:   "Demand",
      entityId: id,
      action:   "HOMOLOGATION",
      oldValue: { status: demand.status },
      newValue: {
        status:          "HOMOLOGADA_PRODUCAO",
        homologatedById: actor.id,
        ...(data.homologationNotes && { homologationNotes: data.homologationNotes }),
      },
      userId:   actor.id,
    });
  },

  // 7. AGUARDANDO_HOMOLOGACAO → REPROVADA
  async rejectDemand(id: string, input: RejectDemandInput, actor: UserForPermission) {
    const demand = await getDemand(id);
    const demandPerm = { id: demand.id, creatorId: demand.creatorId, assigneeId: demand.assigneeId, status: demand.status };

    if (demand.status !== "AGUARDANDO_HOMOLOGACAO") {
      throw new WorkflowError("Apenas demandas aguardando homologação podem ser reprovadas");
    }
    assertTransition(actor, demandPerm, "REPROVADA");

    const data = rejectDemandSchema.parse(input);

    await demandRepository.updateStatus(id, "REPROVADA", {
      rejectionReason: data.rejectionReason,
    });

    await auditService.log({
      entity:   "Demand",
      entityId: id,
      action:   "REJECTION",
      oldValue: { status: demand.status },
      newValue: { status: "REPROVADA", rejectionReason: data.rejectionReason },
      userId:   actor.id,
    });
  },

  // 8. REPROVADA ou AGUARDANDO_HOMOLOGACAO → EM_DESENVOLVIMENTO
  async returnToDevelopment(id: string, actor: UserForPermission) {
    const demand = await getDemand(id);
    const demandPerm = { id: demand.id, creatorId: demand.creatorId, assigneeId: demand.assigneeId, status: demand.status };

    const allowed: DemandStatus[] = ["REPROVADA", "AGUARDANDO_HOMOLOGACAO"];
    if (!allowed.includes(demand.status)) {
      throw new WorkflowError("A demanda não pode ser retornada para desenvolvimento neste status");
    }
    assertTransition(actor, demandPerm, "EM_DESENVOLVIMENTO");

    await demandRepository.updateStatus(id, "EM_DESENVOLVIMENTO");

    await auditService.log({
      entity:   "Demand",
      entityId: id,
      action:   "STATUS_CHANGE",
      oldValue: { status: demand.status },
      newValue: { status: "EM_DESENVOLVIMENTO" },
      userId:   actor.id,
    });
  },

  // 9. Cancelar (RASCUNHO, ABERTA, EM_ANALISE, APROVADA, EM_DESENVOLVIMENTO → CANCELADA)
  async cancelDemand(id: string, input: CancelDemandInput, actor: UserForPermission) {
    const demand = await getDemand(id);
    const demandPerm = { id: demand.id, creatorId: demand.creatorId, assigneeId: demand.assigneeId, status: demand.status };

    if (!canCancelDemand(actor, demandPerm)) {
      throw new WorkflowError("Você não tem permissão para cancelar esta demanda neste status");
    }

    const data = cancelDemandSchema.parse(input);

    await demandRepository.updateStatus(id, "CANCELADA", {
      canceledAt:        new Date(),
      canceledById:      actor.id,
      cancellationReason: data.cancellationReason,
    });

    await auditService.log({
      entity:   "Demand",
      entityId: id,
      action:   "DEMAND_CANCELED",
      oldValue: { status: demand.status },
      newValue: { status: "CANCELADA", cancellationReason: data.cancellationReason },
      userId:   actor.id,
    });
  },

  // ── Consulta de transições disponíveis ───────────────────────────
  async getAllowedTransitions(id: string, actor: UserForPermission): Promise<DemandStatus[]> {
    const demand = await getDemand(id);
    const demandPerm = { id: demand.id, creatorId: demand.creatorId, assigneeId: demand.assigneeId, status: demand.status };

    const ALL_FROM_STATUS: Record<DemandStatus, DemandStatus[]> = {
      RASCUNHO:               ["ABERTA", "CANCELADA"],
      ABERTA:                 ["EM_ANALISE", "CANCELADA"],
      EM_ANALISE:             ["PRIORIZACAO_DIRETORIA", "REPROVADA", "CANCELADA"],
      PRIORIZACAO_DIRETORIA:  ["APROVADA", "EM_ANALISE", "CANCELADA"],
      APROVADA:               ["EM_DESENVOLVIMENTO", "CANCELADA"],
      EM_DESENVOLVIMENTO:     ["AGUARDANDO_HOMOLOGACAO", "CANCELADA"],
      AGUARDANDO_HOMOLOGACAO: ["HOMOLOGADA_PRODUCAO", "REPROVADA", "EM_DESENVOLVIMENTO"],
      HOMOLOGADA_PRODUCAO:    [],
      REPROVADA:              ["EM_DESENVOLVIMENTO", "CANCELADA"],
      CANCELADA:              [],
      CONCLUIDA:              [],
    };

    const candidates = ALL_FROM_STATUS[demand.status] ?? [];
    return candidates.filter((s) => canChangeDemandStatus(actor, demandPerm, s));
  },
};
