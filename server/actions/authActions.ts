"use server";

import { redirect } from "next/navigation";
import { authService } from "@/services/authService";
import { loginSchema, type LoginInput } from "@/validations/auth";
import type { ActionResult } from "@/types";
import { ZodError } from "zod";

/** Papéis que têm acesso ao dashboard. Os demais caem em /demandas. */
const DASHBOARD_ROLES = ["ADMIN", "GESTOR", "FINANCEIRO", "DEV"];

export async function loginAction(input: LoginInput): Promise<ActionResult<{ redirectTo: string }>> {
  try {
    loginSchema.parse(input);
    await authService.login(input);

    // Descobre o papel do usuário para redirecionar corretamente
    const { getCurrentUser } = await import("@/server/auth/helpers");
    const user = await getCurrentUser();
    const redirectTo = user && DASHBOARD_ROLES.includes(user.role)
      ? "/dashboard"
      : "/demandas";

    return { success: true, data: { redirectTo } };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error: "Dados inválidos", details: error.flatten() };
    }
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Erro ao fazer login" };
  }
}

export async function logoutAction(): Promise<void> {
  await authService.logout();
  redirect("/login");
}
