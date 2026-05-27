"use server";

import { redirect } from "next/navigation";
import { authService } from "@/services/authService";
import { loginSchema, type LoginInput } from "@/validations/auth";
import type { ActionResult } from "@/types";
import { ZodError } from "zod";

export async function loginAction(input: LoginInput): Promise<ActionResult> {
  try {
    loginSchema.parse(input);
    await authService.login(input);
    return { success: true, data: undefined };
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
