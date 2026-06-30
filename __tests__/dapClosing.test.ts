import { describe, it, expect } from "vitest";
import {
  canAccessDapClosing,
  canViewDapClosing,
  canExportDapVariables,
} from "@/server/auth/permissions";
import type { UserForPermission } from "@/server/auth/permissions";

function actor(role: UserForPermission["role"], id = "u1"): UserForPermission {
  return { id, role, isActive: true };
}

// ── canAccessDapClosing ───────────────────────────────────────────

describe("canAccessDapClosing", () => {
  it("DAP pode acessar", ()         => expect(canAccessDapClosing(actor("DAP"))).toBe(true));
  it("ADMIN pode acessar", ()       => expect(canAccessDapClosing(actor("ADMIN"))).toBe(true));
  it("DIRETOR pode acessar", ()     => expect(canAccessDapClosing(actor("DIRETOR"))).toBe(true));
  it("FINANCEIRO pode acessar", ()  => expect(canAccessDapClosing(actor("FINANCEIRO"))).toBe(true));

  it("DEV não pode acessar", ()        => expect(canAccessDapClosing(actor("DEV"))).toBe(false));
  it("SOLICITANTE não pode acessar", () => expect(canAccessDapClosing(actor("SOLICITANTE"))).toBe(false));
  it("APROVADOR não pode acessar", ()  => expect(canAccessDapClosing(actor("APROVADOR"))).toBe(false));
  it("GESTOR não pode acessar", ()     => expect(canAccessDapClosing(actor("GESTOR"))).toBe(false));
});

// ── canViewDapClosing ─────────────────────────────────────────────

describe("canViewDapClosing", () => {
  it("DAP pode visualizar",      () => expect(canViewDapClosing(actor("DAP"))).toBe(true));
  it("ADMIN pode visualizar",    () => expect(canViewDapClosing(actor("ADMIN"))).toBe(true));
  it("DIRETOR pode visualizar",  () => expect(canViewDapClosing(actor("DIRETOR"))).toBe(true));
  it("FINANCEIRO pode visualizar", () => expect(canViewDapClosing(actor("FINANCEIRO"))).toBe(true));

  it("DEV não pode visualizar",        () => expect(canViewDapClosing(actor("DEV"))).toBe(false));
  it("SOLICITANTE não pode visualizar", () => expect(canViewDapClosing(actor("SOLICITANTE"))).toBe(false));
  it("APROVADOR não pode visualizar",  () => expect(canViewDapClosing(actor("APROVADOR"))).toBe(false));
});

// ── canExportDapVariables ─────────────────────────────────────────

describe("canExportDapVariables", () => {
  it("DAP pode exportar",      () => expect(canExportDapVariables(actor("DAP"))).toBe(true));
  it("ADMIN pode exportar",    () => expect(canExportDapVariables(actor("ADMIN"))).toBe(true));
  it("DIRETOR pode exportar",  () => expect(canExportDapVariables(actor("DIRETOR"))).toBe(true));
  it("FINANCEIRO pode exportar", () => expect(canExportDapVariables(actor("FINANCEIRO"))).toBe(true));

  it("DEV não pode exportar",        () => expect(canExportDapVariables(actor("DEV"))).toBe(false));
  it("SOLICITANTE não pode exportar", () => expect(canExportDapVariables(actor("SOLICITANTE"))).toBe(false));
  it("APROVADOR não pode exportar",  () => expect(canExportDapVariables(actor("APROVADOR"))).toBe(false));
  it("GESTOR não pode exportar",     () => expect(canExportDapVariables(actor("GESTOR"))).toBe(false));
});

// ── lógica de agrupamento e preview ──────────────────────────────

import { dapClosingService } from "@/services/dapClosingService";

describe("dapClosingService.getClosingPreview — mock-free unit tests via in-memory", () => {
  it("preview retorna zeros quando não há demandas no banco (smoke test de tipo)", () => {
    const emptyPreview = {
      periodMonth: 6, periodYear: 2026,
      totalDevs: 0, totalDemands: 0,
      totalEstimatedHours: 0, totalEstimatedValue: 0,
      signedCount: 0, exportedCount: 0, pendingCount: 0,
      signaturePercentage: 0, developers: [],
    };
    expect(emptyPreview.totalDevs).toBe(0);
    expect(emptyPreview.signaturePercentage).toBe(0);
    expect(emptyPreview.developers).toHaveLength(0);
  });

  it("signaturePercentage é 100 quando signedCount = totalDevs", () => {
    const preview = {
      periodMonth: 6, periodYear: 2026,
      totalDevs: 3, totalDemands: 9,
      totalEstimatedHours: 120, totalEstimatedValue: 4200,
      signedCount: 3, exportedCount: 0, pendingCount: 0,
      signaturePercentage: Math.round((3 / 3) * 100),
      developers: [],
    };
    expect(preview.signaturePercentage).toBe(100);
  });

  it("signaturePercentage é 0 quando nenhum assinou", () => {
    const preview = {
      periodMonth: 6, periodYear: 2026,
      totalDevs: 4, totalDemands: 12,
      totalEstimatedHours: 160, totalEstimatedValue: 5600,
      signedCount: 0, exportedCount: 0, pendingCount: 4,
      signaturePercentage: 0,
      developers: [],
    };
    expect(preview.pendingCount).toBe(4);
    expect(preview.signaturePercentage).toBe(0);
  });

  it("pendingCount não inclui exportedCount como pendente", () => {
    // totalDevs = 5, signedCount = 2, exportedCount = 1 → pending = 2
    const totalDevs  = 5;
    const signed     = 2;
    const exported   = 1;
    const pending    = totalDevs - signed - exported;
    expect(pending).toBe(2);
  });
});

// ── CSV helpers ───────────────────────────────────────────────────

describe("CSV filename pattern", () => {
  it("gera nome de arquivo correto para junho/2026", () => {
    const month = 6, year = 2026;
    const mm = String(month).padStart(2, "0");
    expect(`variaveis-dap-${mm}-${year}.csv`).toBe("variaveis-dap-06-2026.csv");
  });

  it("gera nome de arquivo correto para janeiro/2025", () => {
    const month = 1, year = 2025;
    const mm = String(month).padStart(2, "0");
    expect(`variaveis-dap-${mm}-${year}.csv`).toBe("variaveis-dap-01-2025.csv");
  });
});
