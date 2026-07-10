import type { WorkerProfile } from "@prisma/client";
import { DEVELOPER_BENCHMARK_HOURLY_RATES, TEAM_ACCELERATOR } from "./benchmarkRates";
import { HOURLY_RATES } from "@/lib/demand-pricing";

export type CalculateBenchmarkEconomyInput = {
  estimatedHours:        number;
  workerProfile:         WorkerProfile;
  ourHourlyRate?:        number;
  ourValue?:             number;
  complexityMultiplier?: number;
  roiMultiplier?:        number;
  teamAccelerator?:      number;
  marketHourlyRate?:     number;
};

export type BenchmarkEconomyResult = {
  estimatedHours:      number;
  workerProfile:       WorkerProfile;
  ourHourlyRate:       number;
  marketHourlyRate:    number;
  ourValue:            number;
  marketBenchBase:     number;
  acceleratorImpact:   number;
  marketBenchAdjusted: number;
  rawDifference:       number;
  economy:             number;
  economyPercent:      number;
  status:              "COM_ECONOMIA" | "ACIMA_DO_MERCADO" | "SEM_DIFERENCA";
};

function zeroResult(workerProfile: WorkerProfile): BenchmarkEconomyResult {
  return {
    estimatedHours: 0, workerProfile,
    ourHourlyRate: 0, marketHourlyRate: 0,
    ourValue: 0, marketBenchBase: 0,
    acceleratorImpact: 0, marketBenchAdjusted: 0,
    rawDifference: 0, economy: 0, economyPercent: 0,
    status: "SEM_DIFERENCA",
  };
}

export function calculateBenchmarkEconomy(
  input: CalculateBenchmarkEconomyInput,
): BenchmarkEconomyResult {
  const {
    estimatedHours,
    workerProfile,
    ourHourlyRate,
    ourValue,
    complexityMultiplier,
    roiMultiplier,
    teamAccelerator,
  } = input;

  if (!estimatedHours || estimatedHours <= 0) return zeroResult(workerProfile);

  const resolvedOurRate   = ourHourlyRate   ?? HOURLY_RATES[workerProfile]  ?? 0;
  const resolvedComplexity = complexityMultiplier ?? 1;
  const resolvedRoi        = roiMultiplier        ?? 1;
  const resolvedAccelerator = teamAccelerator ?? TEAM_ACCELERATOR;

  const resolvedOurValue = ourValue != null
    ? ourValue
    : estimatedHours * resolvedOurRate * resolvedComplexity * resolvedRoi;

  const marketHourlyRate    = input.marketHourlyRate ?? DEVELOPER_BENCHMARK_HOURLY_RATES[workerProfile];
  const marketBenchBase     = estimatedHours * marketHourlyRate;
  const acceleratorImpact   = (resolvedAccelerator / 100) * 0.10;
  const marketBenchAdjusted = marketBenchBase * (1 + acceleratorImpact);
  const rawDifference       = resolvedOurValue - marketBenchAdjusted;
  const economy             = resolvedOurValue < marketBenchAdjusted
    ? marketBenchAdjusted - resolvedOurValue
    : 0;
  const economyPercent      = marketBenchAdjusted > 0
    ? economy / marketBenchAdjusted
    : 0;

  const status: BenchmarkEconomyResult["status"] =
    resolvedOurValue < marketBenchAdjusted ? "COM_ECONOMIA" :
    resolvedOurValue > marketBenchAdjusted ? "ACIMA_DO_MERCADO" :
    "SEM_DIFERENCA";

  return {
    estimatedHours,
    workerProfile,
    ourHourlyRate: resolvedOurRate,
    marketHourlyRate,
    ourValue: resolvedOurValue,
    marketBenchBase,
    acceleratorImpact,
    marketBenchAdjusted,
    rawDifference,
    economy,
    economyPercent,
    status,
  };
}
