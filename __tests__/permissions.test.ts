import { describe, it, expect } from "vitest";
import {
  canCreateUser,
  canEditUser,
  canDeactivateUser,
  canCreateDemand,
  canEditDemand,
  canChangeDemandStatus,
  canHomologateDemand,
  canViewFinancialData,
  canViewDashboard,
  type UserForPermission,
  type DemandForPermission,
} from "@/server/auth/permissions";
import type { UserRole, DemandStatus } from "@prisma/client";

// -------------------------------------------------------
// Factories
// -------------------------------------------------------
function user(role: UserRole, id = "u1"): UserForPermission {
  return { id, role, isActive: true };
}

function demand(
  creatorId = "u1",
  assigneeId: string | null = null,
  status: DemandStatus = "ABERTA",
): DemandForPermission {
  return { id: "d1", creatorId, assigneeId, status };
}

// -------------------------------------------------------
// canCreateUser
// -------------------------------------------------------
describe("canCreateUser", () => {
  it("ADMIN pode criar usuário", () => {
    expect(canCreateUser(user("ADMIN"))).toBe(true);
  });

  it("GESTOR não pode criar usuário", () => {
    expect(canCreateUser(user("GESTOR"))).toBe(false);
  });

  it("DEV não pode criar usuário", () => {
    expect(canCreateUser(user("DEV"))).toBe(false);
  });

  it("APROVADOR não pode criar usuário", () => {
    expect(canCreateUser(user("APROVADOR"))).toBe(false);
  });

  it("FINANCEIRO não pode criar usuário", () => {
    expect(canCreateUser(user("FINANCEIRO"))).toBe(false);
  });
});

// -------------------------------------------------------
// canEditUser
// -------------------------------------------------------
describe("canEditUser", () => {
  it("ADMIN pode editar qualquer usuário", () => {
    expect(canEditUser(user("ADMIN"), user("DEV", "u2"))).toBe(true);
  });

  it("GESTOR não pode editar usuário", () => {
    expect(canEditUser(user("GESTOR"), user("DEV", "u2"))).toBe(false);
  });
});

// -------------------------------------------------------
// canDeactivateUser
// -------------------------------------------------------
describe("canDeactivateUser", () => {
  it("ADMIN pode desativar outro usuário", () => {
    expect(canDeactivateUser(user("ADMIN", "admin-id"), user("DEV", "dev-id"))).toBe(true);
  });

  it("ADMIN não pode auto-desativar", () => {
    expect(canDeactivateUser(user("ADMIN", "same-id"), user("ADMIN", "same-id"))).toBe(false);
  });

  it("GESTOR não pode desativar usuário", () => {
    expect(canDeactivateUser(user("GESTOR"), user("DEV", "u2"))).toBe(false);
  });
});

// -------------------------------------------------------
// canCreateDemand
// -------------------------------------------------------
describe("canCreateDemand", () => {
  it("ADMIN pode criar demanda", () => {
    expect(canCreateDemand(user("ADMIN"))).toBe(true);
  });

  it("GESTOR pode criar demanda", () => {
    expect(canCreateDemand(user("GESTOR"))).toBe(true);
  });

  it("DEV pode criar demanda", () => {
    expect(canCreateDemand(user("DEV"))).toBe(true);
  });

  it("APROVADOR pode criar demanda", () => {
    expect(canCreateDemand(user("APROVADOR"))).toBe(true);
  });

  it("FINANCEIRO pode criar demanda", () => {
    expect(canCreateDemand(user("FINANCEIRO"))).toBe(true);
  });

  it("SOLICITANTE pode criar demanda", () => {
    expect(canCreateDemand(user("SOLICITANTE"))).toBe(true);
  });

  it("usuário inativo não pode criar demanda", () => {
    expect(canCreateDemand({ id: "x", role: "DEV", isActive: false })).toBe(false);
  });
});

// -------------------------------------------------------
// canEditDemand — restrição por status (RASCUNHO | ABERTA)
// -------------------------------------------------------
describe("canEditDemand", () => {
  // ── Status editável: RASCUNHO e ABERTA ─────────────────────────
  it("ADMIN pode editar demanda em RASCUNHO", () => {
    expect(canEditDemand(user("ADMIN", "a"), demand("b", null, "RASCUNHO"))).toBe(true);
  });

  it("ADMIN pode editar demanda em ABERTA", () => {
    expect(canEditDemand(user("ADMIN", "a"), demand("b", null, "ABERTA"))).toBe(true);
  });

  it("ADMIN não pode editar demanda em EM_ANALISE", () => {
    expect(canEditDemand(user("ADMIN", "a"), demand("b", null, "EM_ANALISE"))).toBe(false);
  });

  it("ADMIN não pode editar demanda em PRIORIZACAO_DIRETORIA", () => {
    expect(canEditDemand(user("ADMIN", "a"), demand("b", null, "PRIORIZACAO_DIRETORIA"))).toBe(false);
  });

  it("ADMIN não pode editar demanda em APROVADA", () => {
    expect(canEditDemand(user("ADMIN", "a"), demand("b", null, "APROVADA"))).toBe(false);
  });

  it("GESTOR pode editar demanda em RASCUNHO", () => {
    expect(canEditDemand(user("GESTOR", "g"), demand("g", null, "RASCUNHO"))).toBe(true);
  });

  it("GESTOR pode editar demanda de outro em ABERTA", () => {
    expect(canEditDemand(user("GESTOR", "g"), demand("outro", null, "ABERTA"))).toBe(true);
  });

  it("GESTOR não pode editar demanda em EM_ANALISE", () => {
    expect(canEditDemand(user("GESTOR", "g"), demand("g", null, "EM_ANALISE"))).toBe(false);
  });

  // ── DEV não edita dados gerais da demanda ──────────────────────
  it("DEV não pode editar demanda atribuída a ele (edição geral não permitida)", () => {
    expect(canEditDemand(user("DEV", "dev1"), demand("gestor", "dev1", "ABERTA"))).toBe(false);
  });

  it("DEV não pode editar demanda que criou (edição geral não permitida)", () => {
    expect(canEditDemand(user("DEV", "dev1"), demand("dev1", null, "ABERTA"))).toBe(false);
  });

  it("DEV não pode editar demanda de outro dev", () => {
    expect(canEditDemand(user("DEV", "dev1"), demand("gestor", "dev2", "ABERTA"))).toBe(false);
  });

  // ── SOLICITANTE: só demandas próprias em RASCUNHO / ABERTA ─────
  it("SOLICITANTE pode editar demanda que criou (RASCUNHO)", () => {
    expect(canEditDemand(user("SOLICITANTE", "s1"), demand("s1", null, "RASCUNHO"))).toBe(true);
  });

  it("SOLICITANTE pode editar demanda que criou (ABERTA)", () => {
    expect(canEditDemand(user("SOLICITANTE", "s1"), demand("s1", null, "ABERTA"))).toBe(true);
  });

  it("SOLICITANTE não pode editar própria demanda em EM_ANALISE", () => {
    expect(canEditDemand(user("SOLICITANTE", "s1"), demand("s1", null, "EM_ANALISE"))).toBe(false);
  });

  it("SOLICITANTE não pode editar própria demanda em APROVADA", () => {
    expect(canEditDemand(user("SOLICITANTE", "s1"), demand("s1", null, "APROVADA"))).toBe(false);
  });

  it("SOLICITANTE não pode editar demanda de outro usuário", () => {
    expect(canEditDemand(user("SOLICITANTE", "s1"), demand("s2", null, "ABERTA"))).toBe(false);
  });

  // ── Outros papéis não editam demandas ──────────────────────────
  it("FINANCEIRO não pode editar demanda", () => {
    expect(canEditDemand(user("FINANCEIRO", "f1"), demand("gestor", "dev1", "ABERTA"))).toBe(false);
  });

  it("APROVADOR não pode editar demanda", () => {
    expect(canEditDemand(user("APROVADOR", "apr"), demand("g", "dev1", "ABERTA"))).toBe(false);
  });
});

// -------------------------------------------------------
// canChangeDemandStatus
// -------------------------------------------------------
describe("canChangeDemandStatus", () => {
  it("ADMIN pode qualquer transição", () => {
    expect(canChangeDemandStatus(user("ADMIN"), demand(), "HOMOLOGADA_PRODUCAO")).toBe(true);
  });

  it("GESTOR pode mover demanda para ABERTA", () => {
    expect(canChangeDemandStatus(user("GESTOR"), demand(), "ABERTA")).toBe(true);
  });

  it("DEV pode mover demanda atribuída para EM_DESENVOLVIMENTO", () => {
    expect(canChangeDemandStatus(user("DEV", "dev1"), demand("g", "dev1"), "EM_DESENVOLVIMENTO")).toBe(true);
  });

  it("DEV não pode mover demanda de outro para EM_DESENVOLVIMENTO", () => {
    expect(canChangeDemandStatus(user("DEV", "dev1"), demand("g", "dev2"), "EM_DESENVOLVIMENTO")).toBe(false);
  });

  it("APROVADOR pode homologar (AGUARDANDO → HOMOLOGADA_PRODUCAO)", () => {
    expect(canChangeDemandStatus(user("APROVADOR", "apr"), demand("g", "dev1"), "HOMOLOGADA_PRODUCAO")).toBe(true);
  });

  it("APROVADOR não pode homologar demanda em que é o assignee (auto-homologação)", () => {
    expect(canChangeDemandStatus(user("APROVADOR", "apr"), demand("g", "apr"), "HOMOLOGADA_PRODUCAO")).toBe(false);
  });

  it("FINANCEIRO não pode alterar status", () => {
    expect(canChangeDemandStatus(user("FINANCEIRO"), demand(), "CANCELADA")).toBe(false);
  });
});

// -------------------------------------------------------
// canHomologateDemand
// -------------------------------------------------------
describe("canHomologateDemand", () => {
  it("APROVADOR pode homologar demanda de outro", () => {
    expect(canHomologateDemand(user("APROVADOR", "apr"), demand("g", "dev1"))).toBe(true);
  });

  it("APROVADOR não pode homologar a própria entrega", () => {
    expect(canHomologateDemand(user("APROVADOR", "apr"), demand("g", "apr"))).toBe(false);
  });

  it("DEV não pode homologar", () => {
    expect(canHomologateDemand(user("DEV", "dev"), demand("g", "dev"))).toBe(false);
  });

  it("GESTOR pode homologar demanda de outro desenvolvedor (Módulo 4)", () => {
    // GESTOR recebeu permissão de homologação no Módulo 4 para agilizar o fluxo
    // A restrição de auto-homologação ainda se aplica
    expect(canHomologateDemand(user("GESTOR"), demand())).toBe(true);
  });

  it("GESTOR não pode homologar demanda em que é o responsável técnico", () => {
    const gestor = user("GESTOR", "gest");
    expect(canHomologateDemand(gestor, demand("c", "gest"))).toBe(false);
  });

  it("ADMIN pode homologar", () => {
    expect(canHomologateDemand(user("ADMIN", "adm"), demand("g", "dev1"))).toBe(true);
  });
});

// -------------------------------------------------------
// canViewFinancialData
// -------------------------------------------------------
describe("canViewFinancialData", () => {
  it("FINANCEIRO pode visualizar dados financeiros", () => {
    expect(canViewFinancialData(user("FINANCEIRO"))).toBe(true);
  });

  it("ADMIN pode visualizar dados financeiros", () => {
    expect(canViewFinancialData(user("ADMIN"))).toBe(true);
  });

  it("GESTOR pode visualizar dados financeiros", () => {
    expect(canViewFinancialData(user("GESTOR"))).toBe(true);
  });

  it("DEV não pode visualizar dados financeiros", () => {
    expect(canViewFinancialData(user("DEV"))).toBe(false);
  });

  it("APROVADOR não pode visualizar dados financeiros", () => {
    expect(canViewFinancialData(user("APROVADOR"))).toBe(false);
  });

  it("SOLICITANTE não pode visualizar dados financeiros", () => {
    expect(canViewFinancialData(user("SOLICITANTE"))).toBe(false);
  });
});

// -------------------------------------------------------
// canViewDashboard
// -------------------------------------------------------
describe("canViewDashboard", () => {
  it("ADMIN pode ver dashboard", () => {
    expect(canViewDashboard(user("ADMIN"))).toBe(true);
  });

  it("GESTOR pode ver dashboard", () => {
    expect(canViewDashboard(user("GESTOR"))).toBe(true);
  });

  it("FINANCEIRO pode ver dashboard", () => {
    expect(canViewDashboard(user("FINANCEIRO"))).toBe(true);
  });

  it("DEV não pode ver dashboard", () => {
    expect(canViewDashboard(user("DEV"))).toBe(false);
  });

  it("SOLICITANTE não pode ver dashboard", () => {
    expect(canViewDashboard(user("SOLICITANTE"))).toBe(false);
  });
});
