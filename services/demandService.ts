import { demandRepository }   from "@/repositories/demandRepository";
import { auditService }        from "@/services/auditService";
import { prisma }              from "@/lib/prisma";
import {
  createDemandSchema,
  updateDemandSchema,
  changeDemandStatusSchema,
  ALLOWED_TRANSITIONS,
  type CreateDemandInput,
  type UpdateDemandInput,
  type ChangeDemandStatusInput,
} from "@/validations/demand";
import { createEvidenceSchema, type CreateEvidenceInput } from "@/validations/evidence";
import { calculateDemandEstimatedValue, isTechnicalRole } from "@/lib/demand-pricing";
import type { DemandFilters }    from "@/types";
import type { DemandStatus, WorkerProfile } from "@prisma/client";
import type { UserForPermission } from "@/server/auth/permissions";
import {
  canCreateDemand,
  canEditDemand,
  canChangeDemandStatus,
  canAttachEvidence,
  canViewDemand,
  canDeleteDemand,
} from "@/server/auth/permissions";

// ── Validação de data de entrega ──────────────────────────────────
// Regra: entrega não pode ser no passado.
// Exceção: GESTOR e ADMIN podem definir datas retroativas.
function assertDeliveryDate(date: Date | null | undefined, actor: UserForPermission) {
  if (!date) return;
  if (actor.role === "GESTOR" || actor.role === "ADMIN") return;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) {
    throw new Error("A data de entrega prevista não pode ser anterior a hoje.");
  }
}

// ── Tipos internos de pricing ─────────────────────────────────────

type PricingSnapshot = {
  estimatedDemandValue?:    number;
  assigneeProfileSnapshot?: WorkerProfile;
  hourlyRateSnapshot?:      number;
};

/**
 * Busca o assignee no banco e recalcula os campos de pricing para segurança.
 * NUNCA confia nos valores enviados pelo frontend.
 */
async function buildPricingSnapshot(
  assigneeId:     string | null | undefined,
  estimatedHours: number | null | undefined,
  complexity:     string | null | undefined,
  roi:            string | null | undefined,
): Promise<PricingSnapshot> {
  if (!assigneeId || !estimatedHours || !complexity || !roi) return {};

  const assignee = await prisma.user.findUnique({
    where: { id: assigneeId },
    select: { role: true, isActive: true, workerProfile: true },
  });

  if (!assignee || !assignee.isActive) return {};

  // Apenas DEV tem precificação por hora.
  // Todos os demais papéis (GESTOR, ARQUITETO, SUPORTE) têm estimatedDemandValue = 0.
  if (assignee.role !== "DEV") {
    return {
      estimatedDemandValue:    0,
      assigneeProfileSnapshot: assignee.workerProfile ?? undefined,
      hourlyRateSnapshot:      0,
    };
  }

  // DEV: precificação completa por hora — requer perfil técnico
  if (!assignee.workerProfile) return {};

  const pricing = calculateDemandEstimatedValue({
    workerProfile:  assignee.workerProfile,
    estimatedHours,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    complexity: complexity as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    roi:        roi as any,
  });

  return {
    estimatedDemandValue:    pricing.estimatedValue,
    assigneeProfileSnapshot: assignee.workerProfile,
    hourlyRateSnapshot:      pricing.hourlyRate,
  };
}

// ── Erros de domínio ─────────────────────────────────────────────

export class DemandNotFoundError extends Error {
  constructor(id: string) {
    super(`Demanda ${id} não encontrada`);
    this.name = "DemandNotFoundError";
  }
}

export class InvalidStatusTransitionError extends Error {
  constructor(from: DemandStatus, to: DemandStatus) {
    super(`Transição de status inválida: ${from} → ${to}`);
    this.name = "InvalidStatusTransitionError";
  }
}

export class DemandPermissionError extends Error {
  constructor(action: string) {
    super(`Sem permissão para ${action}`);
    this.name = "DemandPermissionError";
  }
}

// ── Service ──────────────────────────────────────────────────────

export const demandService = {
  async getById(id: string, actor?: UserForPermission) {
    const demand = await demandRepository.findById(id);
    if (!demand) throw new DemandNotFoundError(id);

    if (actor) {
      const demandPerm = { id: demand.id, creatorId: demand.creatorId, assigneeId: demand.assigneeId, status: demand.status };
      if (!canViewDemand(actor, demandPerm)) throw new DemandPermissionError("visualizar esta demanda");
    }

    return demand;
  },

  async listDemands(filters: DemandFilters = {}) {
    return demandRepository.findMany(filters);
  },

  async getStats() {
    return demandRepository.countByStatus();
  },

  async createDemand(input: CreateDemandInput, actor: UserForPermission) {
    if (!canCreateDemand(actor)) throw new DemandPermissionError("criar demanda");

    const data = createDemandSchema.parse(input);
    const { saveAsDraft, ...demandData } = data;

    // Valida data de entrega (não pode ser no passado, exceto GESTOR/ADMIN)
    assertDeliveryDate(demandData.plannedDeliveryDate ?? null, actor);

    // Backend recalcula pricing — nunca confia no frontend
    const pricing = saveAsDraft
      ? {}
      : await buildPricingSnapshot(
          demandData.assigneeId,
          demandData.estimatedHours,
          demandData.complexity,
          demandData.roi,
        );

    const demand = await demandRepository.create({
      ...demandData,
      ...pricing,
      status: saveAsDraft ? "RASCUNHO" : "ABERTA",
    });

    await auditService.log({
      entity:   "Demand",
      entityId: demand.id,
      action:   "CREATE",
      newValue: {
        title:      demand.title,
        status:     demand.status,
        priority:   demand.priority,
        demandType: demand.demandType,
        estimatedDemandValue: (demand as { estimatedDemandValue?: number }).estimatedDemandValue,
      },
      userId:   actor.id,
    });

    return demand;
  },

  async updateDemand(id: string, input: UpdateDemandInput, actor: UserForPermission) {
    const data = updateDemandSchema.parse(input);

    const existing = await demandRepository.findById(id);
    if (!existing) throw new DemandNotFoundError(id);

    const demandPerm = { id: existing.id, creatorId: existing.creatorId, assigneeId: existing.assigneeId, status: existing.status };
    if (!canEditDemand(actor, demandPerm)) throw new DemandPermissionError("editar esta demanda");

    // Valida data de entrega (não pode ser no passado, exceto GESTOR/ADMIN)
    assertDeliveryDate(data.plannedDeliveryDate ?? null, actor);

    // Papéis técnicos só podem editar campos operacionais
    let payload = data;
    if (isTechnicalRole(actor.role)) {
      payload = {
        actualStartDate:    data.actualStartDate,
        actualDeliveryDate: data.actualDeliveryDate,
        observations:       data.observations,
      } as UpdateDemandInput;
    }

    // Backend recalcula pricing para papéis não-técnicos quando houver alteração de execução
    let pricingUpdate: PricingSnapshot = {};
    if (!isTechnicalRole(actor.role) && (data.assigneeId || data.estimatedHours || data.complexity || data.roi)) {
      pricingUpdate = await buildPricingSnapshot(
        data.assigneeId ?? existing.assigneeId,
        data.estimatedHours ?? existing.estimatedHours,
        data.complexity      ?? existing.complexity,
        data.roi             ?? existing.roi,
      );
    }

    const updated = await demandRepository.update(id, { ...payload, ...pricingUpdate });

    await auditService.log({
      entity:   "Demand",
      entityId: id,
      action:   "UPDATE",
      oldValue: { title: existing.title, priority: existing.priority, assigneeId: existing.assigneeId, plannedDeliveryDate: existing.plannedDeliveryDate },
      newValue: { title: updated.title,  priority: updated.priority,  assigneeId: updated.assigneeId,  plannedDeliveryDate: updated.plannedDeliveryDate },
      userId:   actor.id,
    });

    return updated;
  },

  async changeStatus(id: string, input: ChangeDemandStatusInput, actor: UserForPermission) {
    const { currentStatus, newStatus, reason } = changeDemandStatusSchema.parse(input);

    const existing = await demandRepository.findById(id);
    if (!existing) throw new DemandNotFoundError(id);

    if (existing.status !== currentStatus) {
      throw new InvalidStatusTransitionError(existing.status, newStatus);
    }

    const demandPerm = { id: existing.id, creatorId: existing.creatorId, assigneeId: existing.assigneeId, status: existing.status };
    if (!canChangeDemandStatus(actor, demandPerm, newStatus)) {
      throw new DemandPermissionError(`alterar status para ${newStatus}`);
    }

    if (!ALLOWED_TRANSITIONS[currentStatus]?.includes(newStatus)) {
      throw new InvalidStatusTransitionError(currentStatus, newStatus);
    }

    const extra: Partial<{ actualDeliveryDate: Date; actualStartDate: Date; homologationDate: Date }> = {};
    if (newStatus === "EM_DESENVOLVIMENTO" && !existing.actualStartDate) extra.actualStartDate = new Date();
    if (newStatus === "AGUARDANDO_HOMOLOGACAO") extra.actualDeliveryDate = new Date();
    if (newStatus === "HOMOLOGADA_PRODUCAO")    extra.homologationDate   = new Date();

    const updated = await demandRepository.updateStatus(id, newStatus, extra);

    const action =
      newStatus === "HOMOLOGADA_PRODUCAO" ? "HOMOLOGATION" :
      newStatus === "REPROVADA"           ? "REJECTION"    :
      newStatus === "APROVADA"            ? "APPROVAL"     :
      "STATUS_CHANGE";

    await auditService.log({
      entity:   "Demand",
      entityId: id,
      action,
      oldValue: { status: currentStatus },
      newValue: { status: newStatus, ...(reason && { reason }) },
      userId:   actor.id,
    });

    return updated;
  },

  async addEvidence(input: CreateEvidenceInput, actor: UserForPermission) {
    const data = createEvidenceSchema.parse({ ...input, createdById: actor.id });

    const demand = await demandRepository.findById(data.demandId);
    if (!demand) throw new DemandNotFoundError(data.demandId);

    const demandPerm = { id: demand.id, creatorId: demand.creatorId, assigneeId: demand.assigneeId, status: demand.status };
    if (!canAttachEvidence(actor, demandPerm)) throw new DemandPermissionError("anexar evidência");

    const evidence = await demandRepository.addEvidence({ ...data, createdById: actor.id });

    await auditService.log({
      entity:   "Demand",
      entityId: data.demandId,
      action:   "UPDATE",
      newValue: { evidenceAdded: { title: evidence.title, url: evidence.url } },
      userId:   actor.id,
    });

    return evidence;
  },

  async getEvidences(demandId: string) {
    const demand = await demandRepository.findById(demandId);
    if (!demand) throw new DemandNotFoundError(demandId);
    return demandRepository.findEvidences(demandId);
  },

  async getAuditLogs(demandId: string) {
    const demand = await demandRepository.findById(demandId);
    if (!demand) throw new DemandNotFoundError(demandId);
    return auditService.getLogsForDemand(demandId);
  },

  async deleteDemand(id: string, actor: UserForPermission): Promise<void> {
    if (!canDeleteDemand(actor)) throw new DemandPermissionError("excluir demanda");

    const demand = await demandRepository.findById(id);
    if (!demand) throw new DemandNotFoundError(id);

    // Audit logs usam entityId como string (sem FK), então os excluímos manualmente.
    // DemandEvidence tem onDelete: Cascade — removida automaticamente.
    await prisma.$transaction([
      prisma.auditLog.deleteMany({ where: { entity: "Demand", entityId: id } }),
      prisma.demand.delete({ where: { id } }),
    ]);
  },
};
