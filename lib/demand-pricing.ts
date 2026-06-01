import type { WorkerProfile, ComplexityLevel, RoiLevel } from "@prisma/client";

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
  workerProfile:  WorkerProfile;
  estimatedHours: number;
  complexity:     ComplexityLevel;
  roi:            RoiLevel;
}): DemandPricingResult {
  const { workerProfile, estimatedHours, complexity, roi } = params;

  const hourlyRate     = HOURLY_RATES[workerProfile];
  const combinedFactor = COMBINED_FACTORS[complexity][roi];
  const estimatedValue = hourlyRate * estimatedHours * combinedFactor;

  return { hourlyRate, estimatedHours, combinedFactor, estimatedValue };
}
