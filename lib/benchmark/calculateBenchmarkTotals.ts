import type { WorkerProfile } from "@prisma/client";
import { calculateBenchmarkEconomy } from "./calculateBenchmarkEconomy";

export type DemandForBenchmark = {
  estimatedHours?:          number | null;
  assigneeProfileSnapshot?: WorkerProfile | string | null;
  estimatedDemandValue?:    number | null;
  hourlyRateSnapshot?:      number | null;
};

export type BenchmarkTotals = {
  totalOurValue:            number;
  totalMarketBenchBase:     number;
  totalMarketBenchAdjusted: number;
  totalRawDifference:       number;
  totalEconomy:             number;
  averageEconomyPercent:    number;
  count:                    number;
};

export function calculateBenchmarkTotals(demands: DemandForBenchmark[]): BenchmarkTotals {
  let totalOurValue            = 0;
  let totalMarketBenchBase     = 0;
  let totalMarketBenchAdjusted = 0;
  let count                    = 0;

  for (const d of demands) {
    if (!d.estimatedHours || d.estimatedHours <= 0) continue;
    if (!d.assigneeProfileSnapshot) continue;

    const r = calculateBenchmarkEconomy({
      estimatedHours: d.estimatedHours,
      workerProfile:  d.assigneeProfileSnapshot as WorkerProfile,
      ourHourlyRate:  d.hourlyRateSnapshot ?? undefined,
      ourValue:       d.estimatedDemandValue ?? undefined,
    });

    totalOurValue            += r.ourValue;
    totalMarketBenchBase     += r.marketBenchBase;
    totalMarketBenchAdjusted += r.marketBenchAdjusted;
    count++;
  }

  const totalRawDifference   = totalOurValue - totalMarketBenchAdjusted;
  const totalEconomy         = totalOurValue < totalMarketBenchAdjusted
    ? totalMarketBenchAdjusted - totalOurValue
    : 0;
  const averageEconomyPercent = totalMarketBenchAdjusted > 0
    ? totalEconomy / totalMarketBenchAdjusted
    : 0;

  return {
    totalOurValue,
    totalMarketBenchBase,
    totalMarketBenchAdjusted,
    totalRawDifference,
    totalEconomy,
    averageEconomyPercent,
    count,
  };
}
