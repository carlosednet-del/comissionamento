"use server";

import { requireRole } from "@/server/auth/helpers";
import { benchmarkConfigService } from "@/services/benchmarkConfigService";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { WorkerProfile } from "@prisma/client";
import type { ActionResult } from "@/types";
import type { BenchmarkRateRow, BenchmarkAcceleratorRow } from "@/services/benchmarkConfigService";

const updateRateSchema = z.object({
  profile:    z.enum(["JUNIOR", "PLENO", "SENIOR", "ESPECIALISTA"]),
  marketRate: z.number().positive(),
});

const updateAcceleratorSchema = z.object({
  accelerator: z.number().min(0).max(100),
});

export async function updateBenchmarkRateAction(input: unknown): Promise<ActionResult<BenchmarkRateRow>> {
  try {
    await requireRole(["ADMIN"]);
    const parsed = updateRateSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
    const row = await benchmarkConfigService.upsertRate(parsed.data.profile as WorkerProfile, parsed.data.marketRate);
    revalidatePath("/configuracoes");
    return { success: true, data: row };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar" };
  }
}

export async function resetBenchmarkRateAction(profile: WorkerProfile): Promise<ActionResult<void>> {
  try {
    await requireRole(["ADMIN"]);
    await benchmarkConfigService.resetRate(profile);
    revalidatePath("/configuracoes");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao resetar" };
  }
}

export async function updateBenchmarkAcceleratorAction(input: unknown): Promise<ActionResult<BenchmarkAcceleratorRow>> {
  try {
    await requireRole(["ADMIN"]);
    const parsed = updateAcceleratorSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
    const row = await benchmarkConfigService.upsertAccelerator(parsed.data.accelerator);
    revalidatePath("/configuracoes");
    return { success: true, data: row };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar" };
  }
}

export async function resetBenchmarkAcceleratorAction(): Promise<ActionResult<void>> {
  try {
    await requireRole(["ADMIN"]);
    await benchmarkConfigService.resetAccelerator();
    revalidatePath("/configuracoes");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao resetar" };
  }
}
