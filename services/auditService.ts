import { auditRepository, type CreateAuditInput } from "@/repositories/auditRepository";

export const auditService = {
  async log(data: CreateAuditInput) {
    return auditRepository.create(data);
  },

  async getLogsForDemand(demandId: string) {
    return auditRepository.findByDemand(demandId);
  },

  async getLogsForEntity(entity: string, entityId: string) {
    return auditRepository.findByEntity(entity, entityId);
  },
};
