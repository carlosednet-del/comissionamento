import { describe, it, expect } from "vitest";
import { generateSignatureCode } from "@/lib/statement/generateSignatureCode";
import { generateStatementContentHash } from "@/lib/statement/generateContentHash";
import {
  canViewMyStatement,
  canSignStatement,
  canExportStatement,
} from "@/server/auth/permissions";
import type { UserForPermission } from "@/server/auth/permissions";

function actor(role: UserForPermission["role"], id = "user-1"): UserForPermission {
  return { id, role, isActive: true };
}

// ── generateSignatureCode ─────────────────────────────────────────

describe("generateSignatureCode", () => {
  it("gera exatamente 32 caracteres", () => {
    const code = generateSignatureCode();
    expect(code).toHaveLength(32);
  });

  it("somente letras maiúsculas e dígitos", () => {
    const code = generateSignatureCode();
    expect(/^[A-Z0-9]+$/.test(code)).toBe(true);
  });

  it("gera códigos distintos em chamadas consecutivas", () => {
    const codes = Array.from({ length: 20 }, () => generateSignatureCode());
    const unique = new Set(codes);
    expect(unique.size).toBe(20);
  });
});

// ── generateStatementContentHash ─────────────────────────────────

describe("generateStatementContentHash", () => {
  const base = {
    developerId:         "dev-1",
    periodMonth:         6,
    periodYear:          2026,
    totalEstimatedHours: 40,
    totalEstimatedValue: 1400,
    demands: [
      { demandId: "d1", estimatedHours: 20, estimatedValue: 700 },
      { demandId: "d2", estimatedHours: 20, estimatedValue: 700 },
    ],
  };

  it("retorna hash SHA-256 de 64 hex chars", () => {
    const h = generateStatementContentHash(base);
    expect(/^[a-f0-9]{64}$/.test(h)).toBe(true);
  });

  it("mesmos dados → mesmo hash (determinístico)", () => {
    expect(generateStatementContentHash(base)).toBe(generateStatementContentHash(base));
  });

  it("ordem de demandas não importa (normaliza antes do hash)", () => {
    const reversed = { ...base, demands: [...base.demands].reverse() };
    expect(generateStatementContentHash(base)).toBe(generateStatementContentHash(reversed));
  });

  it("valor diferente → hash diferente", () => {
    const modified = { ...base, totalEstimatedValue: 9999 };
    expect(generateStatementContentHash(base)).not.toBe(generateStatementContentHash(modified));
  });
});

// ── canViewMyStatement ────────────────────────────────────────────

describe("canViewMyStatement", () => {
  it("DEV pode visualizar", () => {
    expect(canViewMyStatement(actor("DEV"))).toBe(true);
  });

  it("ADMIN pode visualizar", () => {
    expect(canViewMyStatement(actor("ADMIN"))).toBe(true);
  });

  it("DIRETOR pode visualizar", () => {
    expect(canViewMyStatement(actor("DIRETOR"))).toBe(true);
  });

  it("GESTOR não pode visualizar", () => {
    expect(canViewMyStatement(actor("GESTOR"))).toBe(false);
  });

  it("SOLICITANTE não pode visualizar", () => {
    expect(canViewMyStatement(actor("SOLICITANTE"))).toBe(false);
  });

  it("FINANCEIRO não pode visualizar", () => {
    expect(canViewMyStatement(actor("FINANCEIRO"))).toBe(false);
  });
});

// ── canSignStatement ──────────────────────────────────────────────

describe("canSignStatement", () => {
  const stmt = { developerId: "dev-1" };

  it("DEV dono pode assinar", () => {
    expect(canSignStatement(actor("DEV", "dev-1"), stmt)).toBe(true);
  });

  it("DEV diferente não pode assinar", () => {
    expect(canSignStatement(actor("DEV", "dev-2"), stmt)).toBe(false);
  });

  it("ADMIN não pode assinar (mesmo sendo master)", () => {
    expect(canSignStatement(actor("ADMIN", "dev-1"), stmt)).toBe(false);
  });

  it("DIRETOR não pode assinar", () => {
    expect(canSignStatement(actor("DIRETOR", "dev-1"), stmt)).toBe(false);
  });
});

// ── canExportStatement ────────────────────────────────────────────

describe("canExportStatement", () => {
  const stmt = { developerId: "dev-1" };

  it("DEV dono pode exportar", () => {
    expect(canExportStatement(actor("DEV", "dev-1"), stmt)).toBe(true);
  });

  it("DEV diferente não pode exportar", () => {
    expect(canExportStatement(actor("DEV", "dev-2"), stmt)).toBe(false);
  });

  it("ADMIN pode exportar qualquer extrato", () => {
    expect(canExportStatement(actor("ADMIN", "outro-id"), stmt)).toBe(true);
  });

  it("DIRETOR pode exportar qualquer extrato", () => {
    expect(canExportStatement(actor("DIRETOR", "outro-id"), stmt)).toBe(true);
  });

  it("GESTOR não pode exportar", () => {
    expect(canExportStatement(actor("GESTOR", "dev-1"), stmt)).toBe(false);
  });
});
