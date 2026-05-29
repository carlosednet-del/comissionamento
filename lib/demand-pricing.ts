import type { WorkerProfile, ComplexityLevel, RoiLevel } from "@prisma/client";

// ── Tabela de valor/hora por cargo ───────────────────────────────────────────

export const HOURLY_RATES: Record<WorkerProfile, number> = {
  // Desenvolvedor
  JUNIOR:               25,
  PLENO:                30,
  SENIOR:               35,
  ESPECIALISTA:         45,
  // Suporte — remuneração sempre zerada
  SUPORTE_JUNIOR:       0,
  SUPORTE_PLENO:        0,
  SUPORTE_SENIOR:       0,
  SUPORTE_ESPECIALISTA: 0,
  // Arquiteto — mesma tabela do Desenvolvedor
  ARQUITETO_JUNIOR:       25,
  ARQUITETO_PLENO:        30,
  ARQUITETO_SENIOR:       35,
  ARQUITETO_ESPECIALISTA: 45,
};

// ── Fator combinado (complexidade × ROI) ─────────────────────────────────────
// Substitui os dois multiplicadores separados por uma única tabela de consulta.

export const COMBINED_FACTORS: Record<ComplexityLevel, Record<RoiLevel, number>> = {
  BAIXA:   { BAIXO: 1.0, MEDIO: 1.2, ALTO: 1.5, ESTRATEGICO: 2.0 },
  MEDIA:   { BAIXO: 1.2, MEDIO: 1.5, ALTO: 2.0, ESTRATEGICO: 2.0 },
  ALTA:    { BAIXO: 1.2, MEDIO: 1.5, ALTO: 2.0, ESTRATEGICO: 2.0 },
  CRITICA: { BAIXO: 1.5, MEDIO: 1.5, ALTO: 2.0, ESTRATEGICO: 2.0 },
};

// ── Labels legíveis ──────────────────────────────────────────────────────────

export const WORKER_PROFILE_LABELS: Record<WorkerProfile, string> = {
  JUNIOR:               "Júnior",
  PLENO:                "Pleno",
  SENIOR:               "Sênior",
  ESPECIALISTA:         "Especialista",
  SUPORTE_JUNIOR:       "Suporte Júnior",
  SUPORTE_PLENO:        "Suporte Pleno",
  SUPORTE_SENIOR:       "Suporte Sênior",
  SUPORTE_ESPECIALISTA: "Suporte Especialista",
  ARQUITETO_JUNIOR:       "Arquiteto Júnior",
  ARQUITETO_PLENO:        "Arquiteto Pleno",
  ARQUITETO_SENIOR:       "Arquiteto Sênior",
  ARQUITETO_ESPECIALISTA: "Arquiteto Especialista",
};

// ── Grupos de perfil (para selects agrupados na UI) ──────────────────────────

export type ProfileGroup = {
  label:    string;
  profiles: WorkerProfile[];
};

export const PROFILE_GROUPS: ProfileGroup[] = [
  {
    label: "Desenvolvedor",
    profiles: ["JUNIOR", "PLENO", "SENIOR", "ESPECIALISTA"],
  },
  {
    label: "Suporte",
    profiles: ["SUPORTE_JUNIOR", "SUPORTE_PLENO", "SUPORTE_SENIOR", "SUPORTE_ESPECIALISTA"],
  },
  {
    label: "Arquiteto",
    profiles: ["ARQUITETO_JUNIOR", "ARQUITETO_PLENO", "ARQUITETO_SENIOR", "ARQUITETO_ESPECIALISTA"],
  },
];

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
 * Calcula o valor estimado de uma demanda com base no cargo do executor,
 * horas estimadas e o fator combinado de complexidade + ROI.
 *
 * Esta função é PURA — não acessa banco de dados.
 * Use no frontend apenas para PRÉVIA. O backend recalcula antes de salvar.
 *
 * Fórmula: hourlyRate × estimatedHours × COMBINED_FACTORS[complexity][roi]
 * Para perfis SUPORTE_*, hourlyRate = 0 → estimatedValue sempre = 0.
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
