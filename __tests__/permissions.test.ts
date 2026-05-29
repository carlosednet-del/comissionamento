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

  it("DEV não pode criar demanda", () => {
    expect(canCreateDemand(user("DEV"))).toBe(false);
  });

  it("APROVADOR não pode criar demanda", () => {
    expect(canCreateDemand(user("APROVADOR"))).toBe(false);
  });

  it("FINANCEIRO não pode criar demanda", () => {
    expect(canCreateDemand(user("FINANCEIRO"))).toBe(false);
  });
});

// -------------------------------------------------------
// canEditDemand
// -------------------------------------------------------
describe("canEditDemand", () => {
  it("ADMIN pode editar qualquer demanda", () => {
    expect(canEditDemand(user("ADMIN", "a"), demand("b", null))).toBe(true);
  });

  it("GESTOR pode editar demanda que criou", () => {
    expect(canEditDemand(user("GESTOR", "g"), demand("g", null))).toBe(true);
  });

  it("GESTOR não pode editar demanda de outro", () => {
    expect(canEditDemand(user("GESTOR", "g"), demand("outro", null))).toBe(false);
  });

  it("DEV pode editar demanda atribuída a ele", () => {
    expect(canEditDemand(user("DEV", "dev1"), demand("gestor", "dev1"))).toBe(true);
  });

  it("DEV não pode editar demanda de outro dev", () => {
    expect(canEditDemand(user("DEV", "dev1"), demand("gestor", "dev2"))).toBe(false);
  });

  it("FINANCEIRO não pode editar demanda", () => {
    expect(canEditDemand(user("FINANCEIRO"), demand())).toBe(false);
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
});
