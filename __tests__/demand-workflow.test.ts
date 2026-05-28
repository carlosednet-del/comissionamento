/**
 * Testes unitários do Workflow de Demandas (Módulo 4)
 *
 * Cobre:
 *  - Transições válidas por perfil
 *  - Bloqueios de transição inválida
 *  - Regras especiais (evidência obrigatória, auto-homologação, motivo)
 *  - Schemas Zod de cada operação
 */

import {
  canChangeDemandStatus,
  canHomologateDemand,
  canCancelDemand,
} from "@/server/auth/permissions";
import {
  sendToHomologationSchema,
  homologateDemandSchema,
  rejectDemandSchema,
  cancelDemandSchema,
  ALLOWED_TRANSITIONS,
} from "@/validations/demand";
import type { UserForPermission, DemandForPermission } from "@/server/auth/permissions";

// ── Fixtures ─────────────────────────────────────────────────────

const admin:    UserForPermission = { id: "u-admin",    role: "ADMIN",    isActive: true };
const gestor:   UserForPermission = { id: "u-gestor",   role: "GESTOR",   isActive: true };
const dev:      UserForPermission = { id: "u-dev",      role: "DEV",      isActive: true };
const devOther: UserForPermission = { id: "u-dev-other",role: "DEV",      isActive: true };
const aprovador:UserForPermission = { id: "u-aprov",    role: "APROVADOR",isActive: true };
const financeiro:UserForPermission= { id: "u-fin",      role: "FINANCEIRO",isActive: true };

function demandAt(
  status: DemandForPermission["status"],
  opts?: Partial<DemandForPermission>,
): DemandForPermission {
  return {
    id:        "demand-1",
    creatorId: "u-gestor",
    assigneeId:"u-dev",
    status,
    ...opts,
  };
}

// ── 1. Transições permitidas — RASCUNHO → ABERTA ──────────────────

describe("RASCUNHO → ABERTA", () => {
  it("ADMIN pode abrir", () => {
    expect(canChangeDemandStatus(admin, demandAt("RASCUNHO"), "ABERTA")).toBe(true);
  });
  it("GESTOR pode abrir", () => {
    expect(canChangeDemandStatus(gestor, demandAt("RASCUNHO"), "ABERTA")).toBe(true);
  });
  it("DEV NÃO pode abrir", () => {
    expect(canChangeDemandStatus(dev, demandAt("RASCUNHO"), "ABERTA")).toBe(false);
  });
  it("APROVADOR NÃO pode abrir", () => {
    expect(canChangeDemandStatus(aprovador, demandAt("RASCUNHO"), "ABERTA")).toBe(false);
  });
});

// ── 2. ABERTA → EM_ANALISE ────────────────────────────────────────

describe("ABERTA → EM_ANALISE", () => {
  it("ADMIN pode", () => {
    expect(canChangeDemandStatus(admin, demandAt("ABERTA"), "EM_ANALISE")).toBe(true);
  });
  it("GESTOR pode", () => {
    expect(canChangeDemandStatus(gestor, demandAt("ABERTA"), "EM_ANALISE")).toBe(true);
  });
  it("DEV NÃO pode", () => {
    expect(canChangeDemandStatus(dev, demandAt("ABERTA"), "EM_ANALISE")).toBe(false);
  });
});

// ── 3. EM_ANALISE → APROVADA ──────────────────────────────────────

describe("EM_ANALISE → APROVADA", () => {
  it("ADMIN pode", () => {
    expect(canChangeDemandStatus(admin, demandAt("EM_ANALISE"), "APROVADA")).toBe(true);
  });
  it("GESTOR pode", () => {
    expect(canChangeDemandStatus(gestor, demandAt("EM_ANALISE"), "APROVADA")).toBe(true);
  });
  it("DEV NÃO pode", () => {
    expect(canChangeDemandStatus(dev, demandAt("EM_ANALISE"), "APROVADA")).toBe(false);
  });
  it("APROVADOR NÃO pode aprovar (só homologa)", () => {
    expect(canChangeDemandStatus(aprovador, demandAt("EM_ANALISE"), "APROVADA")).toBe(false);
  });
});

// ── 4. APROVADA → EM_DESENVOLVIMENTO ─────────────────────────────

describe("APROVADA → EM_DESENVOLVIMENTO", () => {
  it("ADMIN pode", () => {
    expect(canChangeDemandStatus(admin, demandAt("APROVADA"), "EM_DESENVOLVIMENTO")).toBe(true);
  });
  it("GESTOR pode", () => {
    expect(canChangeDemandStatus(gestor, demandAt("APROVADA"), "EM_DESENVOLVIMENTO")).toBe(true);
  });
  it("DEV responsável pode", () => {
    expect(canChangeDemandStatus(dev, demandAt("APROVADA"), "EM_DESENVOLVIMENTO")).toBe(true);
  });
  it("DEV diferente NÃO pode", () => {
    expect(canChangeDemandStatus(devOther, demandAt("APROVADA"), "EM_DESENVOLVIMENTO")).toBe(false);
  });
});

// ── 5. EM_DESENVOLVIMENTO → AGUARDANDO_HOMOLOGACAO ────────────────

describe("EM_DESENVOLVIMENTO → AGUARDANDO_HOMOLOGACAO", () => {
  it("DEV responsável pode", () => {
    expect(canChangeDemandStatus(dev, demandAt("EM_DESENVOLVIMENTO"), "AGUARDANDO_HOMOLOGACAO")).toBe(true);
  });
  it("DEV diferente NÃO pode", () => {
    expect(canChangeDemandStatus(devOther, demandAt("EM_DESENVOLVIMENTO"), "AGUARDANDO_HOMOLOGACAO")).toBe(false);
  });
  it("ADMIN pode", () => {
    expect(canChangeDemandStatus(admin, demandAt("EM_DESENVOLVIMENTO"), "AGUARDANDO_HOMOLOGACAO")).toBe(true);
  });
});

// ── 6. AGUARDANDO_HOMOLOGACAO → HOMOLOGADA_PRODUCAO ──────────────

describe("AGUARDANDO_HOMOLOGACAO → HOMOLOGADA_PRODUCAO", () => {
  it("APROVADOR pode homologar", () => {
    expect(canChangeDemandStatus(aprovador, demandAt("AGUARDANDO_HOMOLOGACAO"), "HOMOLOGADA_PRODUCAO")).toBe(true);
  });
  it("GESTOR pode homologar se não for o responsável", () => {
    expect(canChangeDemandStatus(gestor, demandAt("AGUARDANDO_HOMOLOGACAO"), "HOMOLOGADA_PRODUCAO")).toBe(true);
  });
  it("APROVADOR NÃO pode homologar a própria entrega", () => {
    const demand = demandAt("AGUARDANDO_HOMOLOGACAO", { assigneeId: aprovador.id });
    expect(canChangeDemandStatus(aprovador, demand, "HOMOLOGADA_PRODUCAO")).toBe(false);
  });
  it("GESTOR NÃO pode homologar quando é o responsável", () => {
    const demand = demandAt("AGUARDANDO_HOMOLOGACAO", { assigneeId: gestor.id });
    expect(canChangeDemandStatus(gestor, demand, "HOMOLOGADA_PRODUCAO")).toBe(false);
  });
  it("DEV NÃO pode homologar", () => {
    expect(canChangeDemandStatus(dev, demandAt("AGUARDANDO_HOMOLOGACAO"), "HOMOLOGADA_PRODUCAO")).toBe(false);
  });
  it("FINANCEIRO NÃO pode homologar", () => {
    expect(canChangeDemandStatus(financeiro, demandAt("AGUARDANDO_HOMOLOGACAO"), "HOMOLOGADA_PRODUCAO")).toBe(false);
  });
  it("canHomologateDemand reflete as mesmas regras", () => {
    expect(canHomologateDemand(aprovador, demandAt("AGUARDANDO_HOMOLOGACAO"))).toBe(true);
    expect(canHomologateDemand(dev, demandAt("AGUARDANDO_HOMOLOGACAO"))).toBe(false);
    const selfDemand = demandAt("AGUARDANDO_HOMOLOGACAO", { assigneeId: aprovador.id });
    expect(canHomologateDemand(aprovador, selfDemand)).toBe(false);
  });
});

// ── 7. AGUARDANDO_HOMOLOGACAO → REPROVADA ────────────────────────

describe("AGUARDANDO_HOMOLOGACAO → REPROVADA", () => {
  it("APROVADOR pode reprovar", () => {
    expect(canChangeDemandStatus(aprovador, demandAt("AGUARDANDO_HOMOLOGACAO"), "REPROVADA")).toBe(true);
  });
  it("GESTOR pode reprovar", () => {
    expect(canChangeDemandStatus(gestor, demandAt("AGUARDANDO_HOMOLOGACAO"), "REPROVADA")).toBe(true);
  });
  it("DEV NÃO pode reprovar", () => {
    expect(canChangeDemandStatus(dev, demandAt("AGUARDANDO_HOMOLOGACAO"), "REPROVADA")).toBe(false);
  });
});

// ── 8. Cancelamento ───────────────────────────────────────────────

describe("Cancelamento", () => {
  it("GESTOR pode cancelar RASCUNHO", () => {
    expect(canCancelDemand(gestor, demandAt("RASCUNHO"))).toBe(true);
  });
  it("GESTOR pode cancelar ABERTA", () => {
    expect(canCancelDemand(gestor, demandAt("ABERTA"))).toBe(true);
  });
  it("GESTOR pode cancelar EM_ANALISE", () => {
    expect(canCancelDemand(gestor, demandAt("EM_ANALISE"))).toBe(true);
  });
  it("GESTOR pode cancelar APROVADA", () => {
    expect(canCancelDemand(gestor, demandAt("APROVADA"))).toBe(true);
  });
  it("GESTOR pode cancelar EM_DESENVOLVIMENTO", () => {
    expect(canCancelDemand(gestor, demandAt("EM_DESENVOLVIMENTO"))).toBe(true);
  });
  it("GESTOR NÃO pode cancelar AGUARDANDO_HOMOLOGACAO", () => {
    expect(canCancelDemand(gestor, demandAt("AGUARDANDO_HOMOLOGACAO"))).toBe(false);
  });
  it("DEV NÃO pode cancelar", () => {
    expect(canCancelDemand(dev, demandAt("EM_DESENVOLVIMENTO"))).toBe(false);
  });
  it("APROVADOR NÃO pode cancelar", () => {
    expect(canCancelDemand(aprovador, demandAt("ABERTA"))).toBe(false);
  });
});

// ── 9. Bloqueio de transição inválida ─────────────────────────────

describe("Transições inválidas bloqueadas pelo ALLOWED_TRANSITIONS", () => {
  it("Não existe RASCUNHO → EM_DESENVOLVIMENTO", () => {
    expect(ALLOWED_TRANSITIONS["RASCUNHO"]).not.toContain("EM_DESENVOLVIMENTO");
  });
  it("Não existe HOMOLOGADA_PRODUCAO → REPROVADA", () => {
    expect(ALLOWED_TRANSITIONS["HOMOLOGADA_PRODUCAO"]).not.toContain("REPROVADA");
  });
  it("Não existe CANCELADA → ABERTA", () => {
    expect(ALLOWED_TRANSITIONS["CANCELADA"]).toHaveLength(0);
  });
  it("Não existe CONCLUIDA → qualquer coisa", () => {
    expect(ALLOWED_TRANSITIONS["CONCLUIDA"]).toHaveLength(0);
  });
});

// ── 10. Schemas Zod ───────────────────────────────────────────────

describe("sendToHomologationSchema", () => {
  it("aceita data válida", () => {
    const r = sendToHomologationSchema.safeParse({ actualDeliveryDate: new Date() });
    expect(r.success).toBe(true);
  });
  it("rejeita sem data", () => {
    const r = sendToHomologationSchema.safeParse({});
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toContain("actualDeliveryDate");
  });
  it("aceita com deliveryNotes opcional", () => {
    const r = sendToHomologationSchema.safeParse({
      actualDeliveryDate: new Date(),
      deliveryNotes: "Entregue conforme especificado",
    });
    expect(r.success).toBe(true);
  });
});

describe("homologateDemandSchema", () => {
  it("aceita sem notas (opcional)", () => {
    expect(homologateDemandSchema.safeParse({}).success).toBe(true);
  });
  it("aceita com notas", () => {
    expect(homologateDemandSchema.safeParse({ homologationNotes: "Tudo ok em produção" }).success).toBe(true);
  });
});

describe("rejectDemandSchema", () => {
  it("rejeita motivo ausente", () => {
    const r = rejectDemandSchema.safeParse({});
    expect(r.success).toBe(false);
  });
  it("rejeita motivo curto (< 10 chars)", () => {
    const r = rejectDemandSchema.safeParse({ rejectionReason: "curto" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toContain("10 caracteres");
  });
  it("aceita motivo válido", () => {
    const r = rejectDemandSchema.safeParse({ rejectionReason: "O resultado não atende aos critérios de aceite definidos" });
    expect(r.success).toBe(true);
  });
});

describe("cancelDemandSchema", () => {
  it("rejeita motivo ausente", () => {
    expect(cancelDemandSchema.safeParse({}).success).toBe(false);
  });
  it("rejeita motivo curto", () => {
    const r = cancelDemandSchema.safeParse({ cancellationReason: "mudou" });
    expect(r.success).toBe(false);
  });
  it("aceita motivo válido", () => {
    const r = cancelDemandSchema.safeParse({ cancellationReason: "Prioridade cancelada pela diretoria" });
    expect(r.success).toBe(true);
  });
});

// ── 11. Auditoria — garantia de ação em cada transição ───────────

describe("AuditAction enum coverage", () => {
  // Garante que os novos valores de enum existem no Prisma client
  it("AuditAction inclui DEVELOPMENT_STARTED", async () => {
    const { AuditAction } = await import("@prisma/client");
    expect(AuditAction.DEVELOPMENT_STARTED).toBe("DEVELOPMENT_STARTED");
  });
  it("AuditAction inclui SENT_TO_HOMOLOGATION", async () => {
    const { AuditAction } = await import("@prisma/client");
    expect(AuditAction.SENT_TO_HOMOLOGATION).toBe("SENT_TO_HOMOLOGATION");
  });
  it("AuditAction inclui DEMAND_CANCELED", async () => {
    const { AuditAction } = await import("@prisma/client");
    expect(AuditAction.DEMAND_CANCELED).toBe("DEMAND_CANCELED");
  });
  it("AuditAction inclui EVIDENCE_ADDED", async () => {
    const { AuditAction } = await import("@prisma/client");
    expect(AuditAction.EVIDENCE_ADDED).toBe("EVIDENCE_ADDED");
  });
});
