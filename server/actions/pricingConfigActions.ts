"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/server/auth/helpers";
import { pricingConfigService } from "@/services/pricingConfigService";
import type { ActionResult } from "@/types";
import type { PricingConfigRow, CombinedFactorRow, DeflatorRow } from "@/services/pricingConfigService";

const ALL_PROFILES    = ["JUNIOR", "PLENO", "SENIOR", "ESPECIALISTA"] as const;
const ALL_COMPLEXITIES = ["BAIXA", "MEDIA", "ALTA", "CRITICA"] as const;
const ALL_ROIS         = ["BAIXO", "MEDIO", "ALTO", "ESTRATEGICO"] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Valor/hora + Teto mensal
// ═══════════════════════════════════════════════════════════════════════════════

const updateRateSchema = z.object({
  profile:     z.enum(ALL_PROFILES),
  ratePerHour: z.number().positive("Valor/hora deve ser maior que zero"),
  monthlyCap:  z.number().positive("Teto mensal deve ser maior que zero"),
});

export async function getPricingConfigsAction(): Promise<ActionResult<PricingConfigRow[]>> {
  try {
    await requireRole(["ADMIN"]);
    const rows = await pricingConfigService.getAll();
    return { success: true, data: rows };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao buscar configurações" };
  }
}

export async function updatePricingConfigAction(input: unknown): Promise<ActionResult<PricingConfigRow>> {
  try {
    await requireRole(["ADMIN"]);
    const parsed = updateRateSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
    const row = await pricingConfigService.upsert(parsed.data.profile, parsed.data.ratePerHour, parsed.data.monthlyCap);
    await pricingConfigService.recalculatePendingDemands();
    revalidatePath("/configuracoes");
    revalidatePath("/demandas");
    return { success: true, data: row };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar" };
  }
}

export async function resetPricingConfigAction(profile: unknown): Promise<ActionResult<void>> {
  try {
    await requireRole(["ADMIN"]);
    const parsed = z.enum(ALL_PROFILES).safeParse(profile);
    if (!parsed.success) return { success: false, error: "Perfil inválido" };
    await pricingConfigService.resetToDefault(parsed.data);
    await pricingConfigService.recalculatePendingDemands();
    revalidatePath("/configuracoes");
    revalidatePath("/demandas");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao resetar" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Fator combinado (complexidade × ROI)
// ═══════════════════════════════════════════════════════════════════════════════

const updateCombinedSchema = z.object({
  complexity: z.enum(ALL_COMPLEXITIES),
  roi:        z.enum(ALL_ROIS),
  factor:     z.number().positive("Fator deve ser maior que zero"),
});

export async function updateCombinedFactorAction(input: unknown): Promise<ActionResult<CombinedFactorRow>> {
  try {
    await requireRole(["ADMIN"]);
    const parsed = updateCombinedSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
    const row = await pricingConfigService.upsertCombinedFactor(parsed.data.complexity, parsed.data.roi, parsed.data.factor);
    await pricingConfigService.recalculatePendingDemands();
    revalidatePath("/configuracoes");
    revalidatePath("/demandas");
    return { success: true, data: row };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar" };
  }
}

export async function resetCombinedFactorAction(input: unknown): Promise<ActionResult<void>> {
  try {
    await requireRole(["ADMIN"]);
    const parsed = z.object({ complexity: z.enum(ALL_COMPLEXITIES), roi: z.enum(ALL_ROIS) }).safeParse(input);
    if (!parsed.success) return { success: false, error: "Dados inválidos" };
    await pricingConfigService.resetCombinedFactor(parsed.data.complexity, parsed.data.roi);
    await pricingConfigService.recalculatePendingDemands();
    revalidatePath("/configuracoes");
    revalidatePath("/demandas");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao resetar" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Deflator por atraso
// ═══════════════════════════════════════════════════════════════════════════════

const updateDeflatorSchema = z.object({
  daysLate: z.number().int().min(0).max(5),
  factor:   z.number().min(0, "Fator não pode ser negativo").max(1, "Fator não pode ser maior que 1"),
});

export async function updateDeflatorFactorAction(input: unknown): Promise<ActionResult<DeflatorRow>> {
  try {
    await requireRole(["ADMIN"]);
    const parsed = updateDeflatorSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
    const row = await pricingConfigService.upsertDeflatorFactor(parsed.data.daysLate, parsed.data.factor);
    revalidatePath("/configuracoes");
    return { success: true, data: row };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar" };
  }
}

export async function resetDeflatorFactorAction(daysLate: unknown): Promise<ActionResult<void>> {
  try {
    await requireRole(["ADMIN"]);
    const parsed = z.number().int().min(0).max(5).safeParse(daysLate);
    if (!parsed.success) return { success: false, error: "Dias inválido" };
    await pricingConfigService.resetDeflatorFactor(parsed.data);
    revalidatePath("/configuracoes");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao resetar" };
  }
}
