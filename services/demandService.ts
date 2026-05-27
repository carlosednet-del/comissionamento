import { demandRepository } from "@/repositories/demandRepository";
import { auditService } from "@/services/auditService";
import {
  createDemandSchema,
  updateDemandSchema,
  updateDemandStatusSchema,
  type CreateDemandInput,
  type UpdateDemandInput,
  type UpdateDemandStatusInput,
} from "@/validations/demand";
import { createEvidenceSchema, type CreateEvidenceInput } from "@/validations/evidence";
import type { DemandFilters } from "@/types";
import type { DemandStatus } from "@prisma/client";

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

export const demandService = {
  async getById(id: string) {
    const demand = await demandRepository.findById(id);
    if (!demand) throw new DemandNotFoundError(id);
    return demand;
  },

  async listDemands(filters: DemandFilters = {}) {
    return demandRepository.findMany(filters);
  },

  async createDemand(input: CreateDemandInput, actorId: string) {
    const data = createDemandSchema.parse(input);

    const demand = await demandRepository.create(data);

    await auditService.log({
      entity: "Demand",
      entityId: demand.id,
      action: "CREATE",
      newValue: {
        title: demand.title,
        status: demand.status,
        priority: demand.priority,
        demandType: demand.demandType,
      },
      userId: actorId,
    });

    return demand;
  },

  async updateDemand(id: string, input: UpdateDemandInput, actorId: string) {
    const data = updateDemandSchema.parse(input);

    const existing = await demandRepository.findById(id);
    if (!existing) throw new DemandNotFoundError(id);

    const updated = await demandRepository.update(id, data);

    await auditService.log({
      entity: "Demand",
      entityId: id,
      action: "UPDATE",
      oldValue: {
        title: existing.title,
        description: existing.description,
        priority: existing.priority,
        assigneeId: existing.assigneeId,
      },
      newValue: {
        title: updated.title,
        description: updated.description,
        priority: updated.priority,
        assigneeId: updated.assigneeId,
      },
      userId: actorId,
    });

    return updated;
  },

  async changeStatus(id: string, input: UpdateDemandStatusInput, actorId: string) {
    const { currentStatus, newStatus, reason } = updateDemandStatusSchema.parse(input);

    const existing = await demandRepository.findById(id);
    if (!existing) throw new DemandNotFoundError(id);

    // Verifica se o status atual do banco bate com o informado
    if (existing.status !== currentStatus) {
      throw new InvalidStatusTransitionError(existing.status, newStatus);
    }

    const extra: Partial<{ actualDeliveryDate: Date; homologationDate: Date }> = {};
    if (newStatus === "AGUARDANDO_HOMOLOGACAO") extra.actualDeliveryDate = new Date();
    if (newStatus === "HOMOLOGADA_PRODUCAO") extra.homologationDate = new Date();

    const updated = await demandRepository.updateStatus(id, newStatus, extra);

    const action = newStatus === "HOMOLOGADA_PRODUCAO"
      ? "HOMOLOGATION"
      : newStatus === "REPROVADA"
      ? "REJECTION"
      : newStatus === "APROVADA"
      ? "APPROVAL"
      : "STATUS_CHANGE";

    await auditService.log({
      entity: "Demand",
      entityId: id,
      action,
      oldValue: { status: currentStatus },
      newValue: { status: newStatus, ...(reason && { reason }) },
      userId: actorId,
    });

    return updated;
  },

  async addEvidence(input: CreateEvidenceInput, actorId: string) {
    const data = createEvidenceSchema.parse(input);

    const demand = await demandRepository.findById(data.demandId);
    if (!demand) throw new DemandNotFoundError(data.demandId);

    const evidence = await demandRepository.addEvidence(data);

    await auditService.log({
      entity: "Demand",
      entityId: data.demandId,
      action: "UPDATE",
      newValue: { evidenceAdded: { title: evidence.title, url: evidence.url } },
      userId: actorId,
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
};
