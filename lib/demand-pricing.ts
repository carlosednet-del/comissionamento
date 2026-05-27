import type { WorkerProfile, ComplexityLevel, RoiLevel } from "@prisma/client";

// ── Tabelas de preços e multiplicadores ─────────────────────────────────────

export const HOURLY_RATES: Record<WorkerProfile, number> = {
  JUNIOR:       60,
  PLENO:        80,
  SENIOR:      100,
  ESPECIALISTA: 130,
};

export const COMPLEXITY_MULTIPLIERS: Record<ComplexityLevel, number> = {
  BAIXA:   1.0,
  MEDIA:   1.2,
  ALTA:    1.5,
  CRITICA: 2.0,
};

export const ROI_MULTIPLIERS: Record<RoiLevel, number> = {
  BAIXO:       1.00,
  MEDIO:       1.15,
  ALTO:        1.30,
  ESTRATEGICO: 1.50,
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
  hourlyRate:           number;
  estimatedHours:       number;
  complexityMultiplier: number;
  roiMultiplier:        number;
  estimatedValue:       number;
};

// ── Função pura de cálculo ───────────────────────────────────────────────────
/**
 * Calcula o valor estimado de uma demanda com base no perfil do executor,
 * horas estimadas, nível de complexidade e retorno sobre investimento.
 *
 * Esta função é PURA — não acessa banco de dados.
 * Use no frontend apenas para PRÉVIA. O backend recalcula antes de salvar.
 *
 * Fórmula: hourlyRate × estimatedHours × complexityMultiplier × roiMultiplier
 */
export function calculateDemandEstimatedValue(params: {
  workerProfile:  WorkerProfile;
  estimatedHours: number;
  complexity:     ComplexityLevel;
  roi:            RoiLevel;
}): DemandPricingResult {
  const { workerProfile, estimatedHours, complexity, roi } = params;

  const hourlyRate           = HOURLY_RATES[workerProfile];
  const complexityMultiplier = COMPLEXITY_MULTIPLIERS[complexity];
  const roiMultiplier        = ROI_MULTIPLIERS[roi];

  const estimatedValue = hourlyRate * estimatedHours * complexityMultiplier * roiMultiplier;

  return {
    hourlyRate,
    estimatedHours,
    complexityMultiplier,
    roiMultiplier,
    estimatedValue,
  };
}
