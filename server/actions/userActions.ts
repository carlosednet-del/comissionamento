"use server";

import { userService } from "@/services/userService";
import { requireAuth, toPermissionUser } from "@/server/auth/helpers";
import { createUserSchema, updateUserSchema } from "@/validations/user";
import type { ActionResult, UserFilters } from "@/types";
import { ZodError } from "zod";

function handleError(error: unknown): ActionResult {
  if (error instanceof ZodError) {
    return { success: false, error: "Dados inválidos", details: error.flatten() };
  }
  if (error instanceof Error) {
    return { success: false, error: error.message };
  }
  return { success: false, error: "Erro inesperado" };
}

export async function createUserAction(formData: unknown): Promise<ActionResult<Awaited<ReturnType<typeof userService.getById>>>> {
  try {
    const actor = await requireAuth();
    const input = createUserSchema.parse(formData);
    const user = await userService.createUser(input, toPermissionUser(actor));
    return { success: true, data: user, message: "Usuário criado com sucesso" };
  } catch (error) {
    return handleError(error) as ActionResult<never>;
  }
}

export async function listUsersAction(filters?: UserFilters) {
  try {
    await requireAuth();
    return userService.listUsers(filters);
  } catch {
    return [];
  }
}

export async function getUserAction(id: string): Promise<ActionResult<Awaited<ReturnType<typeof userService.getById>>>> {
  try {
    await requireAuth();
    const user = await userService.getById(id);
    return { success: true, data: user };
  } catch (error) {
    return handleError(error) as ActionResult<never>;
  }
}

export async function updateUserAction(id: string, formData: unknown): Promise<ActionResult<Awaited<ReturnType<typeof userService.getById>>>> {
  try {
    const actor = await requireAuth();
    const input = updateUserSchema.parse(formData);
    const user = await userService.updateUser(id, input, toPermissionUser(actor));
    return { success: true, data: user, message: "Usuário atualizado com sucesso" };
  } catch (error) {
    return handleError(error) as ActionResult<never>;
  }
}

export async function activateUserAction(id: string): Promise<ActionResult> {
  try {
    const actor = await requireAuth();
    await userService.activateUser(id, toPermissionUser(actor));
    return { success: true, data: undefined, message: "Usuário ativado" };
  } catch (error) {
    return handleError(error);
  }
}

export async function deactivateUserAction(id: string): Promise<ActionResult> {
  try {
    const actor = await requireAuth();
    await userService.deactivateUser(id, toPermissionUser(actor));
    return { success: true, data: undefined, message: "Usuário desativado" };
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteUserAction(id: string): Promise<ActionResult> {
  try {
    const actor = await requireAuth();
    await userService.deleteUser(id, toPermissionUser(actor));
    return { success: true, data: undefined, message: "Usuário excluído permanentemente" };
  } catch (error) {
    return handleError(error);
  }
}

export async function toggleUserEntraIdAction(userId: string, value: boolean): Promise<ActionResult> {
  try {
    const actor = await requireAuth();
    await userService.setUseEntraId(userId, value, toPermissionUser(actor));
    return {
      success: true,
      data: undefined,
      message: value ? "Entra ID ativado para o usuário." : "Entra ID desativado — login por e-mail/senha restaurado.",
    };
  } catch (error) {
    return handleError(error);
  }
}

export async function forcePasswordResetAction(userId: string): Promise<ActionResult> {
  try {
    const actor = await requireAuth();
    await userService.forcePasswordReset(userId, toPermissionUser(actor));
    return { success: true, data: undefined, message: "Reset de senha solicitado. O usuário deverá trocar a senha no próximo acesso." };
  } catch (error) {
    return handleError(error);
  }
}

export async function getCurrentUserAction() {
  const { getCurrentUser } = await import("@/server/auth/helpers");
  return getCurrentUser();
}
