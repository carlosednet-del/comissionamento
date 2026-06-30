import { describe, it, expect, vi, beforeEach } from "vitest";
import { changePasswordSchema } from "@/validations/auth";
import { canForcePasswordReset } from "@/server/auth/permissions";
import type { UserForPermission } from "@/server/auth/permissions";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeActor(role: UserForPermission["role"]): UserForPermission {
  return { id: "actor-id", role };
}

// ── changePasswordSchema ──────────────────────────────────────────────────────

describe("changePasswordSchema", () => {
  it("accepts a valid strong password", () => {
    const result = changePasswordSchema.safeParse({
      newPassword:     "Str0ng!Pass",
      confirmPassword: "Str0ng!Pass",
    });
    expect(result.success).toBe(true);
  });

  it("rejects password shorter than 8 chars", () => {
    const result = changePasswordSchema.safeParse({
      newPassword:     "Ab1!",
      confirmPassword: "Ab1!",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.newPassword).toBeDefined();
    }
  });

  it("rejects password without uppercase", () => {
    const result = changePasswordSchema.safeParse({
      newPassword:     "str0ng!pass",
      confirmPassword: "str0ng!pass",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password without lowercase", () => {
    const result = changePasswordSchema.safeParse({
      newPassword:     "STR0NG!PASS",
      confirmPassword: "STR0NG!PASS",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password without digit", () => {
    const result = changePasswordSchema.safeParse({
      newPassword:     "StrongPass!",
      confirmPassword: "StrongPass!",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password without special character", () => {
    const result = changePasswordSchema.safeParse({
      newPassword:     "Str0ngPass1",
      confirmPassword: "Str0ngPass1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects when passwords do not match", () => {
    const result = changePasswordSchema.safeParse({
      newPassword:     "Str0ng!Pass",
      confirmPassword: "Str0ng!Pass2",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.confirmPassword).toBeDefined();
    }
  });

  it("accepts passwords with various special characters", () => {
    const specials = ["@", "#", "$", "%", "^", "&", "*", "(", ")", "-", "+"];
    for (const s of specials) {
      const pwd = `Str0ng${s}Pass`;
      const result = changePasswordSchema.safeParse({ newPassword: pwd, confirmPassword: pwd });
      expect(result.success).toBe(true);
    }
  });

  it("rejects empty newPassword", () => {
    const result = changePasswordSchema.safeParse({ newPassword: "", confirmPassword: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing confirmPassword", () => {
    const result = changePasswordSchema.safeParse({ newPassword: "Str0ng!Pass" });
    expect(result.success).toBe(false);
  });
});

// ── canForcePasswordReset ─────────────────────────────────────────────────────

describe("canForcePasswordReset", () => {
  it("allows ADMIN", () => {
    expect(canForcePasswordReset(makeActor("ADMIN"))).toBe(true);
  });

  it("allows DIRETOR", () => {
    expect(canForcePasswordReset(makeActor("DIRETOR"))).toBe(true);
  });

  it("allows GESTOR", () => {
    expect(canForcePasswordReset(makeActor("GESTOR"))).toBe(true);
  });

  it("denies DEV", () => {
    expect(canForcePasswordReset(makeActor("DEV"))).toBe(false);
  });

  it("denies FINANCEIRO", () => {
    expect(canForcePasswordReset(makeActor("FINANCEIRO"))).toBe(false);
  });

  it("denies SOLICITANTE", () => {
    expect(canForcePasswordReset(makeActor("SOLICITANTE"))).toBe(false);
  });

  it("denies APROVADOR", () => {
    expect(canForcePasswordReset(makeActor("APROVADOR"))).toBe(false);
  });

  it("denies SUPORTE", () => {
    expect(canForcePasswordReset(makeActor("SUPORTE"))).toBe(false);
  });

  it("denies ARQUITETO", () => {
    expect(canForcePasswordReset(makeActor("ARQUITETO"))).toBe(false);
  });

  it("denies DAP", () => {
    expect(canForcePasswordReset(makeActor("DAP"))).toBe(false);
  });
});
