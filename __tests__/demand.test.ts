import { describe, it, expect } from "vitest";
import {
  canViewDemand,
  canEditDemand,
  canChangeDemandStatus,
  canAttachEvidence,
  canCancelDemand,
  canAssignDemand,
  canAssignToOthers,
  type UserForPermission,
  type DemandForPermission,
} from "@/server/auth/permissions";
import { ALLOWED_TRANSITIONS } from "@/validations/demand";
import { createDemandSchema, changeDemandStatusSchema } from "@/validations/demand";
import type { UserRole, DemandStatus } from "@prisma/client";

// ── Factories ────────────────────────────────────────────────────────
function user(role: UserRole, id = "u1"): UserForPermission {
  return { id, role, isActive: true };
}

function demand(
  status: DemandStatus = "ABERTA",
  opts: Partial<{ creatorId: string; assigneeId: string | null }> = {},
): DemandForPermission {
  return {
    id:         "d1",
    status,
    creatorId:  opts.creatorId  ?? "u1",
    assigneeId: opts.assigneeId ?? null,
  };
}

// ── canViewDemand ────────────────────────────────────────────────────
describe("canViewDemand", () => {
  it("ADMIN pode ver qualquer demanda", () => {
    expect(canViewDemand(user("ADMIN"), demand())).toBe(true);
  });

  it("GESTOR pode ver qualquer demanda", () => {
    expect(canViewDemand(user("GESTOR"), demand())).toBe(true);
  });

  it("DEV vê apenas demanda atribuída a ele", () => {
    const d = demand("EM_DESENVOLVIMENTO", { assigneeId: "dev1" });
    expect(canViewDemand(user("DEV", "dev1"), d)).toBe(true);
  });

  it("DEV vê demanda que ele criou", () => {
    const d = demand("ABERTA", { creatorId: "dev1", assigneeId: null });
    expect(canViewDemand(user("DEV", "dev1"), d)).toBe(true);
  });

  it("DEV não vê demanda de outro dev", () => {
    const d = demand("EM_DESENVOLVIMENTO", { assigneeId: "dev2" });
    expect(canViewDemand(user("DEV", "dev1"), d)).toBe(false);
  });

  it("APROVADOR vê demanda em AGUARDANDO_HOMOLOGACAO", () => {
    expect(canViewDemand(user("APROVADOR", "a1"), demand("AGUARDANDO_HOMOLOGACAO", { creatorId: "g1" }))).toBe(true);
  });

  it("APROVADOR não vê demanda de terceiros em ABERTA", () => {
    expect(canViewDemand(user("APROVADOR", "a1"), demand("ABERTA", { creatorId: "g1" }))).toBe(false);
  });

  it("criador vê a própria demanda em qualquer status", () => {
    expect(canViewDemand(user("APROVADOR", "a1"), demand("ABERTA", { creatorId: "a1" }))).toBe(true);
  });

  it("FINANCEIRO vê demanda HOMOLOGADA_PRODUCAO", () => {
    expect(canViewDemand(user("FINANCEIRO", "f1"), demand("HOMOLOGADA_PRODUCAO", { creatorId: "g1" }))).toBe(true);
  });

  it("FINANCEIRO não vê demanda de terceiros em EM_DESENVOLVIMENTO", () => {
    expect(canViewDemand(user("FINANCEIRO", "f1"), demand("EM_DESENVOLVIMENTO", { creatorId: "g1" }))).toBe(false);
  });
});

// ── canEditDemand ────────────────────────────────────────────────────
describe("canEditDemand", () => {
  it("ADMIN pode editar qualquer demanda", () => {
    expect(canEditDemand(user("ADMIN"), demand())).toBe(true);
  });

  it("GESTOR pode editar sua demanda", () => {
    expect(canEditDemand(user("GESTOR", "g1"), demand("ABERTA", { creatorId: "g1" }))).toBe(true);
  });

  it("GESTOR pode editar demanda de outro", () => {
    expect(canEditDemand(user("GESTOR", "g1"), demand("ABERTA", { creatorId: "g2" }))).toBe(true);
  });

  it("DEV pode editar demanda atribuída a ele", () => {
    expect(canEditDemand(user("DEV", "dev1"), demand("EM_DESENVOLVIMENTO", { assigneeId: "dev1" }))).toBe(true);
  });

  it("DEV pode editar demanda que ele criou", () => {
    expect(canEditDemand(user("DEV", "dev1"), demand("ABERTA", { creatorId: "dev1", assigneeId: null }))).toBe(true);
  });

  it("DEV não pode editar demanda de outro dev", () => {
    expect(canEditDemand(user("DEV", "dev1"), demand("EM_DESENVOLVIMENTO", { creatorId: "g1", assigneeId: "dev2" }))).toBe(false);
  });

  it("SOLICITANTE pode editar demanda que criou", () => {
    expect(canEditDemand(user("SOLICITANTE", "s1"), demand("ABERTA", { creatorId: "s1" }))).toBe(true);
  });

  it("APROVADOR não pode editar demanda de terceiros", () => {
    expect(canEditDemand(user("APROVADOR", "a1"), demand("ABERTA", { creatorId: "g1", assigneeId: "dev1" }))).toBe(false);
  });

  it("FINANCEIRO não pode editar demanda de terceiros", () => {
    expect(canEditDemand(user("FINANCEIRO", "f1"), demand("ABERTA", { creatorId: "g1", assigneeId: "dev1" }))).toBe(false);
  });
});

// ── canAssignDemand ──────────────────────────────────────────────────
describe("canAssignDemand", () => {
  it("ADMIN pode atribuir qualquer demanda", () => {
    expect(canAssignDemand(user("ADMIN"), demand())).toBe(true);
  });

  it("GESTOR pode atribuir sua demanda", () => {
    expect(canAssignDemand(user("GESTOR", "g1"), demand("ABERTA", { creatorId: "g1" }))).toBe(true);
  });

  it("GESTOR não pode atribuir demanda de outro", () => {
    expect(canAssignDemand(user("GESTOR", "g1"), demand("ABERTA", { creatorId: "g2" }))).toBe(false);
  });

  it("DEV não pode atribuir", () => {
    expect(canAssignDemand(user("DEV", "dev1"), demand("ABERTA", { assigneeId: "dev1" }))).toBe(false);
  });
});

// ── canAssignToOthers ────────────────────────────────────────────────
describe("canAssignToOthers", () => {
  it("ADMIN pode atribuir a outros", () => {
    expect(canAssignToOthers(user("ADMIN"))).toBe(true);
  });

  it("GESTOR pode atribuir a outros", () => {
    expect(canAssignToOthers(user("GESTOR"))).toBe(true);
  });

  it("DEV não pode atribuir a outros (só para si)", () => {
    expect(canAssignToOthers(user("DEV"))).toBe(false);
  });

  it("SOLICITANTE não pode atribuir a outros (só para si)", () => {
    expect(canAssignToOthers(user("SOLICITANTE"))).toBe(false);
  });

  it("FINANCEIRO não pode atribuir a outros (só para si)", () => {
    expect(canAssignToOthers(user("FINANCEIRO"))).toBe(false);
  });
});

// ── canCancelDemand ──────────────────────────────────────────────────
describe("canCancelDemand", () => {
  it("GESTOR pode cancelar demanda em ABERTA", () => {
    expect(canCancelDemand(user("GESTOR"), demand("ABERTA"))).toBe(true);
  });

  it("GESTOR pode cancelar demanda em EM_DESENVOLVIMENTO", () => {
    expect(canCancelDemand(user("GESTOR"), demand("EM_DESENVOLVIMENTO"))).toBe(true);
  });

  it("GESTOR não pode cancelar demanda já CONCLUIDA", () => {
    expect(canCancelDemand(user("GESTOR"), demand("CONCLUIDA"))).toBe(false);
  });

  it("GESTOR não pode cancelar demanda CANCELADA", () => {
    expect(canCancelDemand(user("GESTOR"), demand("CANCELADA"))).toBe(false);
  });

  it("DEV não pode cancelar", () => {
    expect(canCancelDemand(user("DEV"), demand("EM_DESENVOLVIMENTO", { assigneeId: "dev1" }))).toBe(false);
  });
});

// ── canChangeDemandStatus — transições específicas ───────────────────
describe("canChangeDemandStatus — DEV", () => {
  it("DEV inicia EM_DESENVOLVIMENTO para sua demanda", () => {
    const d = demand("APROVADA", { assigneeId: "dev1" });
    expect(canChangeDemandStatus(user("DEV", "dev1"), d, "EM_DESENVOLVIMENTO")).toBe(true);
  });

  it("DEV não inicia EM_DESENVOLVIMENTO para demanda de outro", () => {
    const d = demand("APROVADA", { assigneeId: "dev2" });
    expect(canChangeDemandStatus(user("DEV", "dev1"), d, "EM_DESENVOLVIMENTO")).toBe(false);
  });

  it("DEV pode mover para AGUARDANDO_HOMOLOGACAO", () => {
    const d = demand("EM_DESENVOLVIMENTO", { assigneeId: "dev1" });
    expect(canChangeDemandStatus(user("DEV", "dev1"), d, "AGUARDANDO_HOMOLOGACAO")).toBe(true);
  });
});

describe("canChangeDemandStatus — APROVADOR", () => {
  it("APROVADOR homologa demanda de outro dev", () => {
    const d = demand("AGUARDANDO_HOMOLOGACAO", { assigneeId: "dev1" });
    expect(canChangeDemandStatus(user("APROVADOR", "apr1"), d, "HOMOLOGADA_PRODUCAO")).toBe(true);
  });

  it("APROVADOR não pode auto-homologar", () => {
    const d = demand("AGUARDANDO_HOMOLOGACAO", { assigneeId: "apr1" });
    expect(canChangeDemandStatus(user("APROVADOR", "apr1"), d, "HOMOLOGADA_PRODUCAO")).toBe(false);
  });

  it("APROVADOR pode reprovar", () => {
    const d = demand("AGUARDANDO_HOMOLOGACAO", { assigneeId: "dev1" });
    expect(canChangeDemandStatus(user("APROVADOR", "apr1"), d, "REPROVADA")).toBe(true);
  });
});

// ── canAttachEvidence ────────────────────────────────────────────────
describe("canAttachEvidence", () => {
  it("ADMIN pode anexar evidência", () => {
    expect(canAttachEvidence(user("ADMIN"), demand())).toBe(true);
  });

  it("DEV pode anexar evidência em sua demanda", () => {
    const d = demand("EM_DESENVOLVIMENTO", { assigneeId: "dev1" });
    expect(canAttachEvidence(user("DEV", "dev1"), d)).toBe(true);
  });

  it("DEV não pode anexar evidência em demanda de outro", () => {
    const d = demand("EM_DESENVOLVIMENTO", { assigneeId: "dev2" });
    expect(canAttachEvidence(user("DEV", "dev1"), d)).toBe(false);
  });

  it("GESTOR pode anexar evidência em demanda que criou", () => {
    const d = demand("EM_DESENVOLVIMENTO", { creatorId: "g1" });
    expect(canAttachEvidence(user("GESTOR", "g1"), d)).toBe(true);
  });

  it("GESTOR não pode anexar evidência em demanda de outro", () => {
    const d = demand("EM_DESENVOLVIMENTO", { creatorId: "g2" });
    expect(canAttachEvidence(user("GESTOR", "g1"), d)).toBe(false);
  });

  it("FINANCEIRO não pode anexar evidência", () => {
    expect(canAttachEvidence(user("FINANCEIRO"), demand())).toBe(false);
  });
});

// ── ALLOWED_TRANSITIONS ──────────────────────────────────────────────
describe("ALLOWED_TRANSITIONS", () => {
  it("RASCUNHO pode ir para ABERTA ou CANCELADA", () => {
    expect(ALLOWED_TRANSITIONS["RASCUNHO"]).toEqual(expect.arrayContaining(["ABERTA", "CANCELADA"]));
  });

  it("CONCLUIDA não tem transições", () => {
    expect(ALLOWED_TRANSITIONS["CONCLUIDA"]).toHaveLength(0);
  });

  it("CANCELADA não tem transições", () => {
    expect(ALLOWED_TRANSITIONS["CANCELADA"]).toHaveLength(0);
  });

  it("AGUARDANDO_HOMOLOGACAO pode ir para HOMOLOGADA_PRODUCAO, REPROVADA ou EM_DESENVOLVIMENTO", () => {
    expect(ALLOWED_TRANSITIONS["AGUARDANDO_HOMOLOGACAO"]).toEqual(
      expect.arrayContaining(["HOMOLOGADA_PRODUCAO", "REPROVADA", "EM_DESENVOLVIMENTO"]),
    );
  });
});

// ── createDemandSchema — validações ──────────────────────────────────
describe("createDemandSchema", () => {
  const base = {
    title:               "Corrigir bug de login",
    description:         "Usuários não conseguem logar após atualização.",
    requesterArea:       "TI",
    requesterName:       "Carlos Fuhr",
    demandType:          "CORRECAO" as const,
    priority:            "ALTA" as const,
    estimatedHours:      8,
    plannedDeliveryDate: new Date("2026-06-30"),
    creatorId:           "clzabcdef0000001",
    saveAsDraft:         false,
  };

  it("aceita dados válidos", () => {
    const result = createDemandSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("rejeita título curto", () => {
    const result = createDemandSchema.safeParse({ ...base, title: "Bug" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.title).toBeDefined();
    }
  });

  it("rejeita horas estimadas negativas", () => {
    const result = createDemandSchema.safeParse({ ...base, estimatedHours: -5 });
    expect(result.success).toBe(false);
  });

  it("rejeita data de entrega anterior ao início", () => {
    const result = createDemandSchema.safeParse({
      ...base,
      plannedStartDate:    new Date("2026-07-01"),
      plannedDeliveryDate: new Date("2026-06-01"),
    });
    expect(result.success).toBe(false);
  });

  it("aceita sem data de início (opcional)", () => {
    const result = createDemandSchema.safeParse({ ...base, plannedStartDate: undefined });
    expect(result.success).toBe(true);
  });

  it("define saveAsDraft como false por padrão", () => {
    const result = createDemandSchema.safeParse({ ...base, saveAsDraft: undefined });
    if (result.success) {
      expect(result.data.saveAsDraft).toBe(false);
    }
  });

  it("define prioridade MEDIA por padrão", () => {
    const result = createDemandSchema.safeParse({ ...base, priority: undefined });
    if (result.success) {
      expect(result.data.priority).toBe("MEDIA");
    }
  });
});

// ── changeDemandStatusSchema ──────────────────────────────────────────
describe("changeDemandStatusSchema", () => {
  it("aceita transição válida ABERTA → EM_ANALISE", () => {
    const result = changeDemandStatusSchema.safeParse({
      currentStatus: "ABERTA",
      newStatus:     "EM_ANALISE",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita transição inválida CONCLUIDA → ABERTA", () => {
    const result = changeDemandStatusSchema.safeParse({
      currentStatus: "CONCLUIDA",
      newStatus:     "ABERTA",
    });
    expect(result.success).toBe(false);
  });

  it("aceita reason opcional", () => {
    const result = changeDemandStatusSchema.safeParse({
      currentStatus: "EM_ANALISE",
      newStatus:     "APROVADA",
      reason:        undefined,
    });
    expect(result.success).toBe(true);
  });

  it("rejeita reason com menos de 5 chars quando fornecido", () => {
    const result = changeDemandStatusSchema.safeParse({
      currentStatus: "EM_ANALISE",
      newStatus:     "REPROVADA",
      reason:        "x",
    });
    expect(result.success).toBe(false);
  });
});
