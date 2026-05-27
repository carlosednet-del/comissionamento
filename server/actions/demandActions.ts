"use server";

import { demandService } from "@/services/demandService";
import type { CreateDemandInput, UpdateDemandInput, UpdateDemandStatusInput } from "@/validations/demand";
import type { CreateEvidenceInput } from "@/validations/evidence";
import type { DemandFilters } from "@/types";

export async function createDemandAction(input: CreateDemandInput, actorId: string) {
  return demandService.createDemand(input, actorId);
}

export async function listDemandsAction(filters?: DemandFilters) {
  return demandService.listDemands(filters);
}

export async function getDemandAction(id: string) {
  return demandService.getById(id);
}

export async function updateDemandAction(id: string, input: UpdateDemandInput, actorId: string) {
  return demandService.updateDemand(id, input, actorId);
}

export async function changeDemandStatusAction(id: string, input: UpdateDemandStatusInput, actorId: string) {
  return demandService.changeStatus(id, input, actorId);
}

export async function addEvidenceAction(input: CreateEvidenceInput, actorId: string) {
  return demandService.addEvidence(input, actorId);
}

export async function getDemandAuditLogsAction(demandId: string) {
  return demandService.getAuditLogs(demandId);
}
