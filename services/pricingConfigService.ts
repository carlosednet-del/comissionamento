/**
 * pricingConfigService
 *
 * Gerencia todas as configurações de precificação editáveis pelo ADMIN:
 *  - Valor/hora e teto mensal por perfil (hourly_rate_configs)
 *  - Fator combinado complexidade × ROI (combined_factor_configs)
 *  - Deflator por dias de atraso (deflator_configs)
 *
 * Fallback: quando a linha não existe no banco, retorna os defaults de
 * `lib/demand-pricing.ts`.
 */

import { prisma } from "@/lib/prisma";
import type { WorkerProfile, ComplexityLevel, RoiLevel } from "@prisma/client";
import {
  HOURLY_RATES,
  MONTHLY_CAPS,
  COMBINED_FACTORS,
  DEFLATOR_FACTORS,
  WORKER_PROFILE_LABELS,
  COMPLEXITY_LABELS,
  ROI_LABELS,
} from "@/lib/demand-pricing";

// ── Tipos públicos ────────────────────────────────────────────────────────────

export type PricingConfigRow = {
  profile:      WorkerProfile;
  label:        string;
  ratePerHour:  number;
  monthlyCap:   number;
  isCustomized: boolean;
};

export type CombinedFactorRow = {
  complexity:       ComplexityLevel;
  roi:              RoiLevel;
  complexityLabel:  string;
  roiLabel:         string;
  factor:           number;
  isCustomized:     boolean;
};

export type DeflatorRow = {
  daysLate:     number;
  label:        string;
  factor:       number;
  isCustomized: boolean;
};

// ── Constantes ────────────────────────────────────────────────────────────────

const PROFILES:     WorkerProfile[]  = ["JUNIOR", "PLENO", "SENIOR", "ESPECIALISTA"];
const COMPLEXITIES: ComplexityLevel[] = ["BAIXA", "MEDIA", "ALTA", "CRITICA"];
const ROIS:         RoiLevel[]        = ["BAIXO", "MEDIO", "ALTO", "ESTRATEGICO"];
const DEFLATOR_DAYS = [0, 1, 2, 3, 4, 5] as const;

const DEFLATOR_DAY_LABELS: Record<number, string> = {
  0: "Sem atraso",
  1: "1 DU",
  2: "2 DU",
  3: "3 DU",
  4: "4 DU",
  5: "5 ou mais DU",
};

// ── Valor/hora + Teto mensal ──────────────────────────────────────────────────

async function getAll(): Promise<PricingConfigRow[]> {
  const dbRows = await prisma.hourlyRateConfig.findMany();
  const dbMap  = new Map(dbRows.map((r) => [r.profile, r]));

  return PROFILES.map((profile) => {
    const db = dbMap.get(profile);
    return {
      profile,
      label:        WORKER_PROFILE_LABELS[profile],
      ratePerHour:  db?.ratePerHour ?? HOURLY_RATES[profile],
      monthlyCap:   db?.monthlyCap  ?? MONTHLY_CAPS[profile],
      isCustomized: !!db,
    };
  });
}

async function getEffectiveRates(): Promise<
  Record<WorkerProfile, { hourlyRate: number; monthlyCap: number }>
> {
  const rows = await getAll();
  return Object.fromEntries(
    rows.map((r) => [r.profile, { hourlyRate: r.ratePerHour, monthlyCap: r.monthlyCap }]),
  ) as Record<WorkerProfile, { hourlyRate: number; monthlyCap: number }>;
}

async function upsert(profile: WorkerProfile, ratePerHour: number, monthlyCap: number): Promise<PricingConfigRow> {
  const row = await prisma.hourlyRateConfig.upsert({
    where:  { profile },
    update: { ratePerHour, monthlyCap },
    create: { profile, ratePerHour, monthlyCap },
  });
  return { profile, label: WORKER_PROFILE_LABELS[profile], ratePerHour: row.ratePerHour, monthlyCap: row.monthlyCap, isCustomized: true };
}

async function resetToDefault(profile: WorkerProfile): Promise<void> {
  await prisma.hourlyRateConfig.deleteMany({ where: { profile } });
}

// ── Fator combinado (complexidade × ROI) ─────────────────────────────────────

async function getAllCombinedFactors(): Promise<CombinedFactorRow[]> {
  const dbRows = await prisma.combinedFactorConfig.findMany();
  const dbMap  = new Map(dbRows.map((r) => [`${r.complexity}:${r.roi}`, r]));

  const result: CombinedFactorRow[] = [];
  for (const complexity of COMPLEXITIES) {
    for (const roi of ROIS) {
      const db = dbMap.get(`${complexity}:${roi}`);
      result.push({
        complexity,
        roi,
        complexityLabel: COMPLEXITY_LABELS[complexity],
        roiLabel:        ROI_LABELS[roi],
        factor:          db?.factor ?? COMBINED_FACTORS[complexity][roi],
        isCustomized:    !!db,
      });
    }
  }
  return result;
}

/** Retorna a matriz completa complexity → roi → factor com valores efetivos. */
async function getEffectiveCombinedFactors(): Promise<Record<ComplexityLevel, Record<RoiLevel, number>>> {
  const rows = await getAllCombinedFactors();
  const result = {} as Record<ComplexityLevel, Record<RoiLevel, number>>;
  for (const complexity of COMPLEXITIES) {
    result[complexity] = {} as Record<RoiLevel, number>;
  }
  for (const row of rows) {
    result[row.complexity][row.roi] = row.factor;
  }
  return result;
}

async function upsertCombinedFactor(complexity: ComplexityLevel, roi: RoiLevel, factor: number): Promise<CombinedFactorRow> {
  await prisma.combinedFactorConfig.upsert({
    where:  { complexity_roi: { complexity, roi } },
    update: { factor },
    create: { complexity, roi, factor },
  });
  return {
    complexity,
    roi,
    complexityLabel: COMPLEXITY_LABELS[complexity],
    roiLabel:        ROI_LABELS[roi],
    factor,
    isCustomized:    true,
  };
}

async function resetCombinedFactor(complexity: ComplexityLevel, roi: RoiLevel): Promise<void> {
  await prisma.combinedFactorConfig.deleteMany({ where: { complexity, roi } });
}

// ── Deflator por atraso ───────────────────────────────────────────────────────

async function getAllDeflatorFactors(): Promise<DeflatorRow[]> {
  const dbRows = await prisma.deflatorConfig.findMany();
  const dbMap  = new Map(dbRows.map((r) => [r.daysLate, r]));

  return DEFLATOR_DAYS.map((daysLate) => {
    const db = dbMap.get(daysLate);
    return {
      daysLate,
      label:        DEFLATOR_DAY_LABELS[daysLate],
      factor:       db?.factor ?? (DEFLATOR_FACTORS[daysLate] ?? 0),
      isCustomized: !!db,
    };
  });
}

/** Retorna mapa daysLate → factor com valores efetivos. */
async function getEffectiveDeflatorFactors(): Promise<Record<number, number>> {
  const rows = await getAllDeflatorFactors();
  return Object.fromEntries(rows.map((r) => [r.daysLate, r.factor]));
}

async function upsertDeflatorFactor(daysLate: number, factor: number): Promise<DeflatorRow> {
  await prisma.deflatorConfig.upsert({
    where:  { daysLate },
    update: { factor },
    create: { daysLate, factor },
  });
  return { daysLate, label: DEFLATOR_DAY_LABELS[daysLate], factor, isCustomized: true };
}

async function resetDeflatorFactor(daysLate: number): Promise<void> {
  await prisma.deflatorConfig.deleteMany({ where: { daysLate } });
}

// ── Exports ───────────────────────────────────────────────────────────────────

export const pricingConfigService = {
  // Valor/hora + Teto
  getAll,
  getEffectiveRates,
  upsert,
  resetToDefault,
  // Fator combinado
  getAllCombinedFactors,
  getEffectiveCombinedFactors,
  upsertCombinedFactor,
  resetCombinedFactor,
  // Deflator
  getAllDeflatorFactors,
  getEffectiveDeflatorFactors,
  upsertDeflatorFactor,
  resetDeflatorFactor,
};
