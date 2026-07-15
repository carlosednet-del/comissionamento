"use server";

import { signIn, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { loginSchema, changePasswordSchema, type LoginInput, type ChangePasswordInput } from "@/validations/auth";
import { requireAuth } from "@/server/auth/helpers";
import { authService } from "@/services/authService";
import { userRepository } from "@/repositories/userRepository";
import { auditService } from "@/services/auditService";
import { getRequestMetadata } from "@/lib/statement/getRequestMetadata";
import { checkLoginRateLimit, resetLoginRateLimit } from "@/lib/rate-limit";
import type { ActionResult } from "@/types";
import { ZodError } from "zod";
import { AuthError } from "next-auth";

const DASHBOARD_ROLES = ["ADMIN", "GESTOR", "FINANCEIRO", "DEV", "DIRETOR"];

export async function loginAction(input: LoginInput): Promise<ActionResult<{ redirectTo: string }>> {
  try {
    loginSchema.parse(input);

    const { ip } = await getRequestMetadata();
    const rl = checkLoginRateLimit(`login:${ip}`);
    if (rl.limited) {
      const minutes = Math.ceil(rl.retryAfterMs / 60_000);
      return { success: false, error: `Muitas tentativas. Aguarde ${minutes} minuto(s) antes de tentar novamente.` };
    }

    await signIn("credentials", { ...input, redirect: false });
    resetLoginRateLimit(`login:${ip}`);

    const { getCurrentUser } = await import("@/server/auth/helpers");
    const user = await getCurrentUser();

    if (user?.forcePasswordChange) {
      return { success: true, data: { redirectTo: "/change-password" } };
    }

    const redirectTo = user && DASHBOARD_ROLES.includes(user.role) ? "/dashboard" : "/demandas";
    return { success: true, data: { redirectTo } };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error: "Dados inválidos", details: error.flatten() };
    }
    if (error instanceof AuthError) {
      return { success: false, error: "E-mail ou senha incorretos" };
    }
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Erro ao fazer login" };
  }
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirect: false });
  redirect("/login");
}

export async function updatePasswordAction(
  input: ChangePasswordInput,
): Promise<ActionResult<void>> {
  try {
    const session = await requireAuth();
    changePasswordSchema.parse(input);

    await authService.updateCurrentUserPassword(session.id, input.newPassword);
    await userRepository.setForcePasswordChange(session.id, false);

    const meta = await getRequestMetadata();
    await auditService.log({
      entity:   "User",
      entityId: session.id,
      action:   "PASSWORD_CHANGED",
      newValue: { ip: meta.ip, userAgent: meta.userAgent },
      userId:   session.id,
    });

    return { success: true, data: undefined };
  } catch (e) {
    if (e instanceof ZodError) {
      const firstError =
        Object.values(e.flatten().fieldErrors)[0]?.[0] ??
        e.flatten().formErrors[0] ??
        "Dados inválidos.";
      return { success: false, error: firstError };
    }
    return { success: false, error: e instanceof Error ? e.message : "Erro ao atualizar senha." };
  }
}
