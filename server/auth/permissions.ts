import type { UserRole, DemandStatus } from "@prisma/client";

export type UserForPermission = {
  id:       string;
  role:     UserRole;
  isActive: boolean;
};

export type DemandForPermission = {
  id:        string;
  creatorId: string;
  assigneeId: string | null;
  status:    DemandStatus;
};

// ── Permissões de usuário ────────────────────────────────────────

function isMaster(role: string): boolean {
  return role === "ADMIN" || role === "DIRETOR";
}

export function canCreateUser(actor: UserForPermission): boolean {
  return isMaster(actor.role);
}

export function canEditUser(actor: UserForPermission, _target: UserForPermission): boolean {
  return isMaster(actor.role);
}

export function canDeactivateUser(actor: UserForPermission, target: UserForPermission): boolean {
  if (!isMaster(actor.role)) return false;
  if (actor.id === target.id) return false; // ADMIN não pode se auto-desativar
  return true;
}

export function canViewAdminRoutes(actor: UserForPermission): boolean {
  return isMaster(actor.role);
}

// ── Permissões de demanda ────────────────────────────────────────

/** Papéis técnicos com acesso operacional equivalente ao DEV */
function isTechnical(role: string): boolean {
  return role === "DEV" || role === "SUPORTE" || role === "ARQUITETO";
}

export function canViewDemand(actor: UserForPermission, demand: DemandForPermission): boolean {
  if (isMaster(actor.role) || actor.role === "GESTOR") return true;
  // O criador sempre vê as próprias demandas (em qualquer status)
  if (demand.creatorId === actor.id) return true;
  if (isTechnical(actor.role)) return demand.assigneeId === actor.id || demand.creatorId === actor.id;
  if (actor.role === "APROVADOR")    return ["AGUARDANDO_HOMOLOGACAO", "HOMOLOGADA_PRODUCAO", "CONCLUIDA"].includes(demand.status);
  if (actor.role === "FINANCEIRO")   return ["HOMOLOGADA_PRODUCAO", "CONCLUIDA"].includes(demand.status);
  if (actor.role === "SOLICITANTE")  return demand.creatorId === actor.id; // só as próprias demandas
  return false;
}

export function canCreateDemand(actor: UserForPermission): boolean {
  // Qualquer usuário ativo pode criar demandas — a demanda criada fica
  // vinculada ao próprio usuário (creatorId = actor.id).
  return actor.isActive;
}

export const DEMAND_EDITABLE_STATUSES: readonly DemandStatus[] = ["RASCUNHO", "ABERTA"];

export function canEditDemand(actor: UserForPermission, demand: DemandForPermission): boolean {
  if (!actor.isActive) return false;
  // ADMIN pode editar em qualquer status do fluxo
  if (actor.role === "ADMIN") return true;
  // GESTOR pode editar até EM_ANALISE inclusive
  if (actor.role === "GESTOR") {
    return ["RASCUNHO", "ABERTA", "EM_ANALISE"].includes(demand.status);
  }
  // Demais perfis: apenas RASCUNHO ou ABERTA
  return (DEMAND_EDITABLE_STATUSES as readonly string[]).includes(demand.status);
}

export function canAssignDemand(actor: UserForPermission, demand: DemandForPermission): boolean {
  if (isMaster(actor.role))  return true;
  if (actor.role === "GESTOR") return demand.creatorId === actor.id;
  return false;
}

/**
 * Define se o usuário pode atribuir uma demanda a OUTRA pessoa.
 * Usuários comuns só criam/editam demandas para si mesmos (responsável = eles
 * próprios ou sem responsável). Apenas ADMIN e GESTOR atribuem a terceiros.
 */
export function canAssignToOthers(actor: UserForPermission): boolean {
  return isMaster(actor.role) || actor.role === "GESTOR";
}

export function canChangeDemandStatus(
  actor: UserForPermission,
  demand: DemandForPermission,
  nextStatus: DemandStatus,
): boolean {
  const { role } = actor;
  if (isMaster(role)) return true;

  switch (nextStatus) {
    case "ABERTA":
    case "EM_ANALISE":
      return role === "GESTOR";

    case "PRIORIZACAO_DIRETORIA":
      return role === "GESTOR";

    case "APROVADA":
      // Aprovação exclusiva via prioritizeAndApproveDemand (ADMIN/DIRETOR)
      return false;

    case "EM_DESENVOLVIMENTO":
      if (isTechnical(role)) return demand.assigneeId === actor.id;
      if (role === "GESTOR") return true;
      return false;

    case "AGUARDANDO_HOMOLOGACAO":
      if (isTechnical(role)) return demand.assigneeId === actor.id;
      if (role === "GESTOR") return true;
      return false;

    case "HOMOLOGADA_PRODUCAO":
      if (role === "APROVADOR" || role === "GESTOR") {
        return demand.assigneeId !== actor.id; // sem auto-homologação
      }
      return false;

    case "REPROVADA":
      return role === "APROVADOR" || role === "GESTOR";

    case "CANCELADA":
      return role === "GESTOR";

    case "CONCLUIDA":
      return false; // ADMIN já tratado acima

    default:
      return false;
  }
}

export function canPrioritizeDemand(actor: UserForPermission): boolean {
  return isMaster(actor.role);
}

export function canReturnApprovedToAnalysis(actor: UserForPermission): boolean {
  return actor.role === "GESTOR" || actor.role === "ADMIN";
}

export function canCancelDemand(actor: UserForPermission, demand: DemandForPermission): boolean {
  const cancellable: DemandStatus[] = ["RASCUNHO", "ABERTA", "EM_ANALISE", "PRIORIZACAO_DIRETORIA", "APROVADA", "EM_DESENVOLVIMENTO"];
  if (!cancellable.includes(demand.status)) return false;
  return canChangeDemandStatus(actor, demand, "CANCELADA");
}

export function canHomologateDemand(actor: UserForPermission, demand: DemandForPermission): boolean {
  if (actor.role !== "APROVADOR" && !isMaster(actor.role) && actor.role !== "GESTOR") return false;
  if (demand.assigneeId === actor.id) return false; // sem auto-homologação
  return true;
}

export function canDeleteDemand(actor: UserForPermission): boolean {
  return isMaster(actor.role);
}

export function canAttachEvidence(actor: UserForPermission, demand: DemandForPermission): boolean {
  if (isMaster(actor.role))           return true;
  if (isTechnical(actor.role))        return demand.assigneeId === actor.id;
  if (actor.role === "GESTOR")        return demand.creatorId === actor.id;
  if (actor.role === "SOLICITANTE")   return demand.creatorId === actor.id;
  return false;
}

// ── Permissões financeiras ───────────────────────────────────────

export function canViewFinancialData(actor: UserForPermission): boolean {
  return (
    isMaster(actor.role)       ||
    actor.role === "FINANCEIRO"||
    actor.role === "GESTOR"    ||
    actor.role === "DEV"
  );
}

export function canViewDashboard(actor: UserForPermission): boolean {
  return (
    isMaster(actor.role)       ||
    actor.role === "GESTOR"    ||
    actor.role === "FINANCEIRO"||
    actor.role === "DEV"
  );
}

export function canViewReports(actor: UserForPermission): boolean {
  return isMaster(actor.role) || actor.role === "GESTOR" || actor.role === "FINANCEIRO";
}

export function canViewBenchmark(actor: UserForPermission): boolean {
  return actor.role === "ADMIN" || actor.role === "DIRETOR" || actor.role === "GESTOR";
}

// ── Permissões de extrato mensal ─────────────────────────────────

export function canViewMyStatement(actor: UserForPermission): boolean {
  return actor.role === "DEV" || isMaster(actor.role);
}

export function canSignStatement(
  actor: UserForPermission,
  statement: { developerId: string },
): boolean {
  return actor.role === "DEV" && actor.id === statement.developerId;
}

export function canExportStatement(
  actor: UserForPermission,
  statement: { developerId: string },
): boolean {
  if (isMaster(actor.role)) return true;
  return actor.role === "DEV" && actor.id === statement.developerId;
}

// ── Permissões de senha ───────────────────────────────────────────

export function canForcePasswordReset(actor: UserForPermission): boolean {
  return isMaster(actor.role) || actor.role === "GESTOR";
}

// ── Permissões de fechamento DAP ─────────────────────────────────

function isDapRole(role: string): boolean {
  return role === "DAP" || isMaster(role) || role === "FINANCEIRO";
}

export function canViewExecutiveDashboard(actor: UserForPermission): boolean {
  return ["ADMIN", "DIRETOR", "GESTOR"].includes(actor.role);
}

export function canExportExecutiveDashboard(actor: UserForPermission): boolean {
  return canViewExecutiveDashboard(actor);
}

export function canAccessDapClosing(actor: UserForPermission): boolean {
  return isDapRole(actor.role);
}

export function canViewDapClosing(actor: UserForPermission): boolean {
  return isDapRole(actor.role);
}

export function canExportDapVariables(actor: UserForPermission): boolean {
  return isDapRole(actor.role);
}

// ── Verificação de rota ──────────────────────────────────────────

const ROUTE_PERMISSIONS: Record<string, (actor: UserForPermission) => boolean> = {
  "/dashboard": canViewDashboard,
  "/usuarios":  canViewAdminRoutes,
  "/parametros": canViewAdminRoutes,
};

export function canAccessRoute(actor: UserForPermission, pathname: string): boolean {
  const checker = ROUTE_PERMISSIONS[pathname];
  if (!checker) return true;
  return checker(actor);
}
