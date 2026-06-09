/**
 * pricingConfigService
 *
 * Gerencia a tabela de configuração de precificação (valor/hora e teto mensal
 * por perfil técnico). Os valores são persistidos em `hourly_rate_configs`.
 *
 * Fallback: quando a linha não existe no banco, retorna os defaults de
 * `lib/demand-pricing.ts` (HOURLY_RATES / MONTHLY_CAPS).
 */

import { prisma } from "@/lib/prisma";
import type { WorkerProfile } from "@prisma/client";
import { HOURLY_RATES, MONTHLY_CAPS, WORKER_PROFILE_LABELS } from "@/lib/demand-pricing";

// ── Tipo público ──────────────────────────────────────────────────────────────

export type PricingConfigRow = {
  profile:      WorkerProfile;
  label:        string;
  ratePerHour:  number;
  monthlyCap:   number;
  isCustomized: boolean; // true = valor vem do banco (foi editado pelo admin)
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const PROFILES: WorkerProfile[] = ["JUNIOR", "PLENO", "SENIOR", "ESPECIALISTA"];

// ── Service ───────────────────────────────────────────────────────────────────

async function getAll(): Promise<PricingConfigRow[]> {
  const dbRows = await prisma.hourlyRateConfig.findMany();
  const dbMap = new Map(dbRows.map((r) => [r.profile, r]));

  return PROFILES.map((profile) => {
    const db = dbMap.get(profile);
    return {
      profile,
      label:        WORKER_PROFILE_LABELS[profile],
      ratePerHour:  db?.ratePerHour  ?? HOURLY_RATES[profile],
      monthlyCap:   db?.monthlyCap   ?? MONTHLY_CAPS[profile],
      isCustomized: !!db,
    };
  });
}

/**
 * Retorna mapa profile → { hourlyRate, monthlyCap } com valores efetivos
 * (banco quando configurado, defaults quando não).
 * Usado por buildPricingSnapshot no demandService.
 */
async function getEffectiveRates(): Promise<
  Record<WorkerProfile, { hourlyRate: number; monthlyCap: number }>
> {
  const rows = await getAll();
  return Object.fromEntries(
    rows.map((r) => [r.profile, { hourlyRate: r.ratePerHour, monthlyCap: r.monthlyCap }]),
  ) as Record<WorkerProfile, { hourlyRate: number; monthlyCap: number }>;
}

/** Salva (ou atualiza) a configuração de um perfil. */
async function upsert(
  profile:     WorkerProfile,
  ratePerHour: number,
  monthlyCap:  number,
): Promise<PricingConfigRow> {
  const row = await prisma.hourlyRateConfig.upsert({
    where:  { profile },
    update: { ratePerHour, monthlyCap },
    create: { profile, ratePerHour, monthlyCap },
  });

  return {
    profile,
    label:        WORKER_PROFILE_LABELS[profile],
    ratePerHour:  row.ratePerHour,
    monthlyCap:   row.monthlyCap,
    isCustomized: true,
  };
}

/** Restaura o perfil para os valores-padrão (remove do banco). */
async function resetToDefault(profile: WorkerProfile): Promise<void> {
  await prisma.hourlyRateConfig.deleteMany({ where: { profile } });
}

export const pricingConfigService = { getAll, getEffectiveRates, upsert, resetToDefault };
