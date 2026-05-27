import * as permissions from "@/server/auth/permissions";
import type { UserForPermission, DemandForPermission } from "@/server/auth/permissions";
import type { DemandStatus } from "@prisma/client";

export class PermissionDeniedError extends Error {
  constructor(action: string) {
    super(`Permissão negada: ${action}`);
    this.name = "PermissionDeniedError";
  }
}

export const permissionService = {
  assertCanCreateUser(actor: UserForPermission) {
    if (!permissions.canCreateUser(actor))
      throw new PermissionDeniedError("criar usuário requer papel ADMIN");
  },

  assertCanEditUser(actor: UserForPermission, target: UserForPermission) {
    if (!permissions.canEditUser(actor, target))
      throw new PermissionDeniedError("editar usuário requer papel ADMIN");
  },

  assertCanDeactivateUser(actor: UserForPermission, target: UserForPermission) {
    if (!permissions.canDeactivateUser(actor, target)) {
      if (actor.id === target.id) throw new PermissionDeniedError("não é possível auto-desativar");
      throw new PermissionDeniedError("desativar usuário requer papel ADMIN");
    }
  },

  assertCanCreateDemand(actor: UserForPermission) {
    if (!permissions.canCreateDemand(actor))
      throw new PermissionDeniedError("criar demanda requer papel ADMIN ou GESTOR");
  },

  assertCanEditDemand(actor: UserForPermission, demand: DemandForPermission) {
    if (!permissions.canEditDemand(actor, demand))
      throw new PermissionDeniedError("sem permissão para editar esta demanda");
  },

  assertCanChangeDemandStatus(
    actor: UserForPermission,
    demand: DemandForPermission,
    nextStatus: DemandStatus,
  ) {
    if (!permissions.canChangeDemandStatus(actor, demand, nextStatus))
      throw new PermissionDeniedError(`sem permissão para alterar status para ${nextStatus}`);
  },

  assertCanHomologateDemand(actor: UserForPermission, demand: DemandForPermission) {
    if (!permissions.canHomologateDemand(actor, demand))
      throw new PermissionDeniedError("homologação requer papel APROVADOR e não pode ser auto-homologação");
  },

  assertCanAttachEvidence(actor: UserForPermission, demand: DemandForPermission) {
    if (!permissions.canAttachEvidence(actor, demand))
      throw new PermissionDeniedError("sem permissão para anexar evidência a esta demanda");
  },

  assertCanViewFinancialData(actor: UserForPermission) {
    if (!permissions.canViewFinancialData(actor))
      throw new PermissionDeniedError("acesso a dados financeiros restrito");
  },
};
