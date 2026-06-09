"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/server/auth/helpers";
import { pricingConfigService } from "@/services/pricingConfigService";
import type { ActionResult } from "@/types";
import type { PricingConfigRow } from "@/services/pricingConfigService";

const ALL_PROFILES = ["JUNIOR", "PLENO", "SENIOR", "ESPECIALISTA"] as const;

const updateRateSchema = z.object({
  profile:     z.enum(ALL_PROFILES),
  ratePerHour: z.number().positive("Valor/hora deve ser maior que zero"),
  monthlyCap:  z.number().positive("Teto mensal deve ser maior que zero"),
});

// ── Listar todos os perfis ────────────────────────────────────────────────────

export async function getPricingConfigsAction(): Promise<
  ActionResult<PricingConfigRow[]>
> {
  try {
    await requireRole(["ADMIN"]);
    const rows = await pricingConfigService.getAll();
    return { success: true, data: rows };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao buscar configurações" };
  }
}

// ── Salvar / atualizar um perfil ──────────────────────────────────────────────

export async function updatePricingConfigAction(
  input: unknown,
): Promise<ActionResult<PricingConfigRow>> {
  try {
    await requireRole(["ADMIN"]);

    const parsed = updateRateSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
    }

    const { profile, ratePerHour, monthlyCap } = parsed.data;
    const row = await pricingConfigService.upsert(profile, ratePerHour, monthlyCap);

    revalidatePath("/configuracoes");
    return { success: true, data: row };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar configuração" };
  }
}

// ── Resetar perfil para o padrão ─────────────────────────────────────────────

export async function resetPricingConfigAction(
  profile: unknown,
): Promise<ActionResult<void>> {
  try {
    await requireRole(["ADMIN"]);

    const parsed = z.enum(ALL_PROFILES).safeParse(profile);
    if (!parsed.success) return { success: false, error: "Perfil inválido" };

    await pricingConfigService.resetToDefault(parsed.data);
    revalidatePath("/configuracoes");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao resetar configuração" };
  }
}
