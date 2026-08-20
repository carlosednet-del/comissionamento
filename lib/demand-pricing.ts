import type { WorkerProfile, ComplexityLevel, RoiLevel, DemandType } from "@prisma/client";

// ── Tipos de demanda que não geram valor ─────────────────────────────────────

/**
 * Tipos de demanda que NÃO são precificados (valor estimado sempre 0).
 * CORRECAO: trabalho corretivo não gera valor.
 */
export const NON_BILLABLE_DEMAND_TYPES: readonly DemandType[] = ["CORRECAO"];

/** Indica se um tipo de demanda gera valor estimado. */
export function demandTypeGeneratesValue(demandType: DemandType | null | undefined): boolean {
  if (!demandType) return true;
  return !NON_BILLABLE_DEMAND_TYPES.includes(demandType);
}

// ── Papéis técnicos (requerem perfil) ────────────────────────────────────────

/**
 * Papéis que exigem WorkerProfile e participam do cálculo de precificação.
 * DEV e ARQUITETO usam HOURLY_RATES normalmente.
 * SUPORTE usa hourlyRate = 0 (multiplicador zero) — tratado em buildPricingSnapshot.
 */
export const TECHNICAL_ROLES = ["DEV", "SUPORTE", "ARQUITETO"] as const;
export type TechnicalRole = typeof TECHNICAL_ROLES[number];

export function isTechnicalRole(role: string): role is TechnicalRole {
  return TECHNICAL_ROLES.includes(role as TechnicalRole);
}

// ── Tabela de valor/hora por perfil técnico ──────────────────────────────────

export const HOURLY_RATES: Record<WorkerProfile, number> = {
  JUNIOR:       25,
  PLENO:        30,
  SENIOR:       35,
  ESPECIALISTA: 45,
};

// ── Teto mensal por perfil (cap de valor final homologado no mês) ─────────────

/**
 * Valor máximo de demandas homologadas que um colaborador pode acumular
 * em um único mês, por perfil técnico.
 *
 * Quando a soma de estimatedDemandValue das demandas homologadas no período
 * ultrapassa este limite, o excesso é descartado no cálculo do valor final.
 */
export const MONTHLY_CAPS: Record<WorkerProfile, number> = {
  JUNIOR:        8_000,
  PLENO:        10_000,
  SENIOR:       12_000,
  ESPECIALISTA: 20_000,
};

// ── Fator combinado (complexidade × ROI) ─────────────────────────────────────

export const COMBINED_FACTORS: Record<ComplexityLevel, Record<RoiLevel, number>> = {
  BAIXA:   { BAIXO: 1.0, MEDIO: 1.2, ALTO: 1.5, ESTRATEGICO: 2.0 },
  MEDIA:   { BAIXO: 1.2, MEDIO: 1.5, ALTO: 2.0, ESTRATEGICO: 2.0 },
  ALTA:    { BAIXO: 1.2, MEDIO: 1.5, ALTO: 2.0, ESTRATEGICO: 2.0 },
  CRITICA: { BAIXO: 1.5, MEDIO: 1.5, ALTO: 2.0, ESTRATEGICO: 2.0 },
};

// ── Labels legíveis ──────────────────────────────────────────────────────────

export const WORKER_PROFILE_LABELS: Record<WorkerProfile, string> = {
  JUNIOR:       "Júnior",
  PLENO:        "Pleno",
  SENIOR:       "Sênior",
  ESPECIALISTA: "Especialista",
};

export const COMPLEXITY_LABELS: Record<ComplexityLevel, string> = {
  BAIXA:   "Baixa",
  MEDIA:   "Média",
  ALTA:    "Alta",
  CRITICA: "Crítica",
};

export const ROI_LABELS: Record<RoiLevel, string> = {
  BAIXO:       "Baixo",
  MEDIO:       "Médio",
  ALTO:        "Alto",
  ESTRATEGICO: "Estratégico",
};

// ── Deflator por atraso ──────────────────────────────────────────────────────
/**
 * Fator multiplicador aplicado ao valor da demanda conforme dias úteis de atraso.
 * 0 DU  = sem atraso → fator 1,00 (nenhum desconto)
 * 1 DU  → 0,75  (−25 %)
 * 2 DU  → 0,50  (−50 %)
 * 3 DU  → 0,25  (−75 %)
 * 4 DU  → 0,10  (−90 %)
 * 5+ DU → −1,00 (penalidade: valor negativo — dev desconta o valor da entrega)
 *
 * "DU" = Dia Útil = dias de semana (seg–sex), feriados nacionais não considerados.
 * Base: actualDeliveryDate − plannedDeliveryDate.
 */
export const DEFLATOR_FACTORS: Record<number, number> = {
  0: 1.00,
  1: 0.75,
  2: 0.50,
  3: 0.25,
  4: 0.10,
  5: -1.00,
};

export function getDeflatorFactor(
  workingDaysLate: number,
  factorsOverride?: Record<number, number>,
): number {
  if (workingDaysLate <= 0) return 1.00;
  const factors = factorsOverride ?? DEFLATOR_FACTORS;
  // Para 5+ DU usamos a chave 5
  const key = Math.min(workingDaysLate, 5);
  return factors[key] ?? -1.00;
}

/** Conta dias úteis (seg–sex) entre duas datas (exclusive start, inclusive end). */
export function countWorkingDays(start: Date, end: Date): number {
  if (end <= start) return 0;
  let count = 0;
  const d = new Date(start);
  d.setDate(d.getDate() + 1);
  const endNorm = new Date(end);
  endNorm.setHours(23, 59, 59, 999);
  while (d <= endNorm) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

export type DeflatorResult = {
  originalValue:    number;
  deflatedValue:    number;
  workingDaysLate:  number;
  factor:           number;
  isLate:           boolean;
};

/**
 * Calcula o valor deflacionado de uma demanda com base nas datas de entrega.
 * Se não houver datas suficientes, retorna sem deflação (fator 1,00).
 */
export function applyDeflator(
  value:           number,
  actualDelivery:  Date | string | null | undefined,
  plannedDelivery: Date | string | null | undefined,
  deflatorFactorsOverride?: Record<number, number>,
): DeflatorResult {
  if (!actualDelivery || !plannedDelivery) {
    return { originalValue: value, deflatedValue: value, workingDaysLate: 0, factor: 1.00, isLate: false };
  }
  const actual  = new Date(actualDelivery);
  const planned = new Date(plannedDelivery);
  actual.setHours(0, 0, 0, 0);
  planned.setHours(0, 0, 0, 0);

  if (actual <= planned) {
    return { originalValue: value, deflatedValue: value, workingDaysLate: 0, factor: 1.00, isLate: false };
  }

  const workingDaysLate = countWorkingDays(planned, actual);
  const factor          = getDeflatorFactor(workingDaysLate, deflatorFactorsOverride);
  const deflatedValue   = Math.round(value * factor * 100) / 100;

  return { originalValue: value, deflatedValue, workingDaysLate, factor, isLate: true };
}

// ── Resultado do cálculo ─────────────────────────────────────────────────────

export type DemandPricingResult = {
  hourlyRate:     number;
  estimatedHours: number;
  combinedFactor: number;
  estimatedValue: number;
};

// ── Função pura de cálculo ───────────────────────────────────────────────────
/**
 * Calcula o valor estimado de uma demanda com base no perfil do executor,
 * horas estimadas e o fator combinado de complexidade + ROI.
 *
 * Esta função é PURA — não acessa banco de dados.
 * Use no frontend apenas para PRÉVIA. O backend recalcula antes de salvar.
 *
 * Fórmula: hourlyRate × estimatedHours × COMBINED_FACTORS[complexity][roi]
 *
 * ⚠  Para usuários com papel SUPORTE, o backend zera estimatedValue
 *    independentemente do perfil — trate isso em buildPricingSnapshot.
 */
export function calculateDemandEstimatedValue(params: {
  workerProfile:         WorkerProfile;
  estimatedHours:        number;
  complexity:            ComplexityLevel;
  roi:                   RoiLevel;
  /** Valor/hora customizado (ex: vindo do banco). Sobrepõe HOURLY_RATES quando fornecido. */
  hourlyRateOverride?:    number;
  /** Fator combinado customizado (ex: vindo do banco). Sobrepõe COMBINED_FACTORS quando fornecido. */
  combinedFactorOverride?: number;
}): DemandPricingResult {
  const { workerProfile, estimatedHours, complexity, roi, hourlyRateOverride, combinedFactorOverride } = params;

  const hourlyRate     = hourlyRateOverride    ?? HOURLY_RATES[workerProfile];
  const combinedFactor = combinedFactorOverride ?? COMBINED_FACTORS[complexity][roi];
  const estimatedValue = hourlyRate * estimatedHours * combinedFactor;

  return { hourlyRate, estimatedHours, combinedFactor, estimatedValue };
}
