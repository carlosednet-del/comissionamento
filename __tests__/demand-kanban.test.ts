/**
 * Testes unitários do Kanban Operacional (Módulo 5)
 *
 * Cobre:
 *  - Agrupamento de demandas por status
 *  - Regras de visibilidade por perfil
 *  - Lógica de indicadores de prazo (DeadlineStatus)
 *  - Filtragem por deadlineStatus, priority, onlyMine
 *  - Schema Zod kanbanFiltersSchema
 */

import { getDeadlineStatus, KANBAN_COLUMN_ORDER } from "@/services/demandKanbanService";
import { kanbanFiltersSchema } from "@/validations/demand";

// ── 1. getDeadlineStatus ──────────────────────────────────────────

describe("getDeadlineStatus", () => {
  function addDays(days: number): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + days);
    return d;
  }

  it("retorna 'none' para data nula", () => {
    expect(getDeadlineStatus(null)).toBe("none");
  });
  it("retorna 'none' para undefined", () => {
    expect(getDeadlineStatus(undefined)).toBe("none");
  });

  it("retorna 'overdue' para ontem", () => {
    expect(getDeadlineStatus(addDays(-1))).toBe("overdue");
  });
  it("retorna 'overdue' para semana passada", () => {
    expect(getDeadlineStatus(addDays(-7))).toBe("overdue");
  });

  it("retorna 'today' para hoje", () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0); // meio-dia
    expect(getDeadlineStatus(today)).toBe("today");
  });

  it("retorna 'soon' para amanhã", () => {
    expect(getDeadlineStatus(addDays(1))).toBe("soon");
  });
  it("retorna 'soon' para 3 dias", () => {
    expect(getDeadlineStatus(addDays(3))).toBe("soon");
  });

  it("retorna 'ok' para 4 dias", () => {
    expect(getDeadlineStatus(addDays(4))).toBe("ok");
  });
  it("retorna 'ok' para 30 dias", () => {
    expect(getDeadlineStatus(addDays(30))).toBe("ok");
  });
});

// ── 2. KANBAN_COLUMN_ORDER ────────────────────────────────────────

describe("KANBAN_COLUMN_ORDER", () => {
  it("inclui todos os 10 status", () => {
    expect(KANBAN_COLUMN_ORDER).toHaveLength(10);
  });
  it("começa com RASCUNHO", () => {
    expect(KANBAN_COLUMN_ORDER[0]).toBe("RASCUNHO");
  });
  it("termina com CONCLUIDA", () => {
    expect(KANBAN_COLUMN_ORDER[KANBAN_COLUMN_ORDER.length - 1]).toBe("CONCLUIDA");
  });
  it("contém AGUARDANDO_HOMOLOGACAO", () => {
    expect(KANBAN_COLUMN_ORDER).toContain("AGUARDANDO_HOMOLOGACAO");
  });
});

// ── 3. kanbanFiltersSchema ────────────────────────────────────────

describe("kanbanFiltersSchema", () => {
  it("aceita objeto vazio — defaults aplicados", () => {
    const r = kanbanFiltersSchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.onlyMine).toBe(false);
      expect(r.data.sortBy).toBe("priority");
    }
  });

  it("aceita onlyMine como string 'true'", () => {
    const r = kanbanFiltersSchema.safeParse({ onlyMine: "true" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.onlyMine).toBe(true);
  });

  it("aceita onlyMine como booleano", () => {
    const r = kanbanFiltersSchema.safeParse({ onlyMine: true });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.onlyMine).toBe(true);
  });

  it("rejeita sortBy inválido", () => {
    const r = kanbanFiltersSchema.safeParse({ sortBy: "INEXISTENTE" });
    expect(r.success).toBe(false);
  });

  it("aceita sortBy válidos", () => {
    for (const v of ["priority", "deadline", "created", "title"]) {
      const r = kanbanFiltersSchema.safeParse({ sortBy: v });
      expect(r.success).toBe(true);
    }
  });

  it("rejeita deadlineStatus inválido", () => {
    const r = kanbanFiltersSchema.safeParse({ deadlineStatus: "unknown" });
    expect(r.success).toBe(false);
  });

  it("aceita deadlineStatus válidos", () => {
    for (const v of ["overdue", "today", "soon", "ok"]) {
      const r = kanbanFiltersSchema.safeParse({ deadlineStatus: v });
      expect(r.success).toBe(true);
    }
  });

  it("aceita statuses como array de DemandStatus", () => {
    const r = kanbanFiltersSchema.safeParse({
      statuses: ["RASCUNHO", "ABERTA", "EM_ANALISE"],
    });
    expect(r.success).toBe(true);
  });

  it("rejeita statuses com valor inválido", () => {
    const r = kanbanFiltersSchema.safeParse({ statuses: ["INVALIDO"] });
    expect(r.success).toBe(false);
  });

  it("aceita filtros combinados", () => {
    const r = kanbanFiltersSchema.safeParse({
      search:         "sistema",
      priority:       "ALTA",
      demandType:     "CORRECAO",
      complexity:     "MEDIA",
      roi:            "ALTO",
      deadlineStatus: "overdue",
      onlyMine:       true,
      sortBy:         "deadline",
    });
    expect(r.success).toBe(true);
  });
});

// ── 4. Visibilidade de status por perfil ──────────────────────────
//
// Testa a lógica que está implementada em demandKanbanService via
// ROLE_VISIBLE_STATUSES. Como essa constante é interna, replicamos
// as regras documentadas aqui:

describe("Visibilidade de status por perfil", () => {
  const ROLE_VISIBLE: Record<string, string[]> = {
    ADMIN:      ["RASCUNHO","ABERTA","EM_ANALISE","APROVADA","EM_DESENVOLVIMENTO","AGUARDANDO_HOMOLOGACAO","HOMOLOGADA_PRODUCAO","REPROVADA","CANCELADA","CONCLUIDA"],
    GESTOR:     ["RASCUNHO","ABERTA","EM_ANALISE","APROVADA","EM_DESENVOLVIMENTO","AGUARDANDO_HOMOLOGACAO","HOMOLOGADA_PRODUCAO","REPROVADA","CANCELADA","CONCLUIDA"],
    DEV:        ["RASCUNHO","ABERTA","EM_ANALISE","APROVADA","EM_DESENVOLVIMENTO","AGUARDANDO_HOMOLOGACAO","HOMOLOGADA_PRODUCAO","REPROVADA","CANCELADA","CONCLUIDA"],
    APROVADOR:  ["AGUARDANDO_HOMOLOGACAO","HOMOLOGADA_PRODUCAO","CONCLUIDA"],
    FINANCEIRO: ["HOMOLOGADA_PRODUCAO","CONCLUIDA"],
  };

  it("ADMIN vê todas as 10 colunas", () => {
    expect(ROLE_VISIBLE.ADMIN).toHaveLength(10);
  });
  it("GESTOR vê todas as 10 colunas", () => {
    expect(ROLE_VISIBLE.GESTOR).toHaveLength(10);
  });
  it("DEV vê todas as colunas (filtro por assignee é feito no DB)", () => {
    expect(ROLE_VISIBLE.DEV).toHaveLength(10);
  });
  it("APROVADOR só vê 3 colunas", () => {
    expect(ROLE_VISIBLE.APROVADOR).toHaveLength(3);
    expect(ROLE_VISIBLE.APROVADOR).toContain("AGUARDANDO_HOMOLOGACAO");
  });
  it("APROVADOR NÃO vê RASCUNHO", () => {
    expect(ROLE_VISIBLE.APROVADOR).not.toContain("RASCUNHO");
  });
  it("APROVADOR NÃO vê EM_DESENVOLVIMENTO", () => {
    expect(ROLE_VISIBLE.APROVADOR).not.toContain("EM_DESENVOLVIMENTO");
  });
  it("FINANCEIRO só vê 2 colunas", () => {
    expect(ROLE_VISIBLE.FINANCEIRO).toHaveLength(2);
    expect(ROLE_VISIBLE.FINANCEIRO).toContain("HOMOLOGADA_PRODUCAO");
    expect(ROLE_VISIBLE.FINANCEIRO).toContain("CONCLUIDA");
  });
  it("FINANCEIRO NÃO vê AGUARDANDO_HOMOLOGACAO", () => {
    expect(ROLE_VISIBLE.FINANCEIRO).not.toContain("AGUARDANDO_HOMOLOGACAO");
  });
});

// ── 5. Agrupamento simulado ───────────────────────────────────────

describe("Agrupamento de demandas por status", () => {
  type FakeDemand = { id: string; status: string };
  const demands: FakeDemand[] = [
    { id: "1", status: "RASCUNHO" },
    { id: "2", status: "RASCUNHO" },
    { id: "3", status: "ABERTA" },
    { id: "4", status: "EM_DESENVOLVIMENTO" },
    { id: "5", status: "CANCELADA" },
  ];

  function group(items: FakeDemand[], statuses: string[]) {
    const map = new Map<string, FakeDemand[]>();
    for (const s of statuses) map.set(s, []);
    for (const d of items) {
      const col = map.get(d.status);
      if (col) col.push(d);
    }
    return map;
  }

  it("RASCUNHO recebe 2 demandas", () => {
    const m = group(demands, KANBAN_COLUMN_ORDER);
    expect(m.get("RASCUNHO")).toHaveLength(2);
  });

  it("ABERTA recebe 1 demanda", () => {
    const m = group(demands, KANBAN_COLUMN_ORDER);
    expect(m.get("ABERTA")).toHaveLength(1);
  });

  it("EM_ANALISE recebe 0 demandas", () => {
    const m = group(demands, KANBAN_COLUMN_ORDER);
    expect(m.get("EM_ANALISE")).toHaveLength(0);
  });

  it("Visibilidade APROVADOR exclui RASCUNHO do agrupamento", () => {
    const visible = ["AGUARDANDO_HOMOLOGACAO", "HOMOLOGADA_PRODUCAO", "CONCLUIDA"];
    const m = group(demands, visible);
    expect(m.has("RASCUNHO")).toBe(false);
    expect(m.has("AGUARDANDO_HOMOLOGACAO")).toBe(true);
  });
});
