"use server";

import { requireRole } from "@/server/auth/helpers";
import { authConfigService } from "@/services/authConfigService";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

export async function toggleEntraIdAction(useEntraId: boolean): Promise<ActionResult<{ useEntraId: boolean }>> {
  try {
    await requireRole(["ADMIN"]);
    const config = await authConfigService.setUseEntraId(useEntraId);
    revalidatePath("/usuarios");
    return { success: true, data: config };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erro inesperado" };
  }
}
