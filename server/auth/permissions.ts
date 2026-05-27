import type { UserRole, DemandStatus } from "@prisma/client";

export type UserForPermission = {
  id: string;
  role: UserRole;
  isActive: boolean;
};

export type DemandForPermission = {
  id: string;
  creatorId: string;
  assigneeId: string | null;
  status: DemandStatus;
};

// -------------------------------------------------------
// Permissões de usuário
// -------------------------------------------------------

export function canCreateUser(actor: UserForPermission): boolean {
  return actor.role === "ADMIN";
}

export function canEditUser(actor: UserForPermission, target: UserForPermission): boolean {
  if (actor.role !== "ADMIN") return false;
  // Impede auto-rebaixamento: ADMIN não pode alterar o próprio role
  // (isso é validado na camada de service)
  return true;
}

export function canDeactivateUser(actor: UserForPermission, target: UserForPermission): boolean {
  if (actor.role !== "ADMIN") return false;
  if (actor.id === target.id) return false; // ADMIN não pode se auto-desativar
  return true;
}

export function canViewAdminRoutes(actor: UserForPermission): boolean {
  return actor.role === "ADMIN";
}

// -------------------------------------------------------
// Permissões de demanda
// -------------------------------------------------------

export function canCreateDemand(actor: UserForPermission): boolean {
  return actor.role === "ADMIN" || actor.role === "GESTOR";
}

export function canEditDemand(actor: UserForPermission, demand: DemandForPermission): boolean {
  if (actor.role === "ADMIN") return true;
  if (actor.role === "GESTOR") return demand.creatorId === actor.id;
  if (actor.role === "DEV") return demand.assigneeId === actor.id;
  return false;
}

export function canChangeDemandStatus(
  actor: UserForPermission,
  demand: DemandForPermission,
  nextStatus: DemandStatus,
): boolean {
  const { role } = actor;

  if (role === "ADMIN") return true;

  switch (nextStatus) {
    case "ABERTA":
    case "EM_ANALISE":
    case "APROVADA":
      return role === "GESTOR";

    case "EM_DESENVOLVIMENTO":
    case "AGUARDANDO_HOMOLOGACAO":
      if (role === "DEV") return demand.assigneeId === actor.id;
      return role === "GESTOR";

    case "HOMOLOGADA_PRODUCAO":
      if (role !== "APROVADOR") return false;
      return demand.assigneeId !== actor.id; // sem auto-homologação

    case "REPROVADA":
      return role === "APROVADOR" || role === "GESTOR";

    case "CANCELADA":
      return role === "GESTOR";

    case "CONCLUIDA":
      return false; // apenas ADMIN, já tratado acima

    default:
      return false;
  }
}

export function canHomologateDemand(actor: UserForPermission, demand: DemandForPermission): boolean {
  if (actor.role !== "APROVADOR" && actor.role !== "ADMIN") return false;
  // Impede auto-homologação
  if (demand.assigneeId === actor.id) return false;
  return true;
}

export function canAttachEvidence(actor: UserForPermission, demand: DemandForPermission): boolean {
  if (actor.role === "ADMIN") return true;
  if (actor.role === "DEV") return demand.assigneeId === actor.id;
  if (actor.role === "GESTOR") return demand.creatorId === actor.id;
  return false;
}

// -------------------------------------------------------
// Permissões financeiras e de relatório
// -------------------------------------------------------

export function canViewFinancialData(actor: UserForPermission): boolean {
  return actor.role === "ADMIN" || actor.role === "FINANCEIRO" || actor.role === "GESTOR";
}

export function canViewDashboard(actor: UserForPermission): boolean {
  return actor.role === "ADMIN" || actor.role === "GESTOR" || actor.role === "FINANCEIRO";
}

export function canViewReports(actor: UserForPermission): boolean {
  return actor.role === "ADMIN" || actor.role === "GESTOR" || actor.role === "FINANCEIRO";
}

// -------------------------------------------------------
// Verificação de acesso a rota
// -------------------------------------------------------

const ROUTE_PERMISSIONS: Record<string, (actor: UserForPermission) => boolean> = {
  "/dashboard": canViewDashboard,
  "/usuarios": canViewAdminRoutes,
  "/parametros": canViewAdminRoutes,
};

export function canAccessRoute(actor: UserForPermission, pathname: string): boolean {
  const checker = ROUTE_PERMISSIONS[pathname];
  if (!checker) return true; // rota sem regra específica → permitido
  return checker(actor);
}
