import { prisma } from "@/lib/prisma";
import type { WorkerProfile } from "@prisma/client";
import { DEVELOPER_BENCHMARK_HOURLY_RATES, TEAM_ACCELERATOR } from "@/lib/benchmark/benchmarkRates";

const PROFILES: WorkerProfile[] = ["JUNIOR", "PLENO", "SENIOR", "ESPECIALISTA"];

export type BenchmarkRateRow = {
  profile:      WorkerProfile;
  label:        string;
  marketRate:   number;
  isCustomized: boolean;
};

const PROFILE_LABELS: Record<WorkerProfile, string> = {
  JUNIOR:       "Júnior",
  PLENO:        "Pleno",
  SENIOR:       "Sênior",
  ESPECIALISTA: "Especialista",
};

async function getAllRates(): Promise<BenchmarkRateRow[]> {
  const dbRows = await prisma.benchmarkRateConfig.findMany();
  const dbMap  = new Map(dbRows.map((r) => [r.profile, r]));

  return PROFILES.map((profile) => {
    const db = dbMap.get(profile);
    return {
      profile,
      label:        PROFILE_LABELS[profile],
      marketRate:   db?.marketRate ?? DEVELOPER_BENCHMARK_HOURLY_RATES[profile],
      isCustomized: !!db,
    };
  });
}

async function getEffectiveRates(): Promise<Record<WorkerProfile, number>> {
  const rows = await getAllRates();
  return Object.fromEntries(rows.map((r) => [r.profile, r.marketRate])) as Record<WorkerProfile, number>;
}

async function upsertRate(profile: WorkerProfile, marketRate: number): Promise<BenchmarkRateRow> {
  await prisma.benchmarkRateConfig.upsert({
    where:  { profile },
    update: { marketRate },
    create: { profile, marketRate },
  });
  return { profile, label: PROFILE_LABELS[profile], marketRate, isCustomized: true };
}

async function resetRate(profile: WorkerProfile): Promise<void> {
  await prisma.benchmarkRateConfig.deleteMany({ where: { profile } });
}

// ── Acelerador de equipe ──────────────────────────────────────────────────────

export type BenchmarkAcceleratorRow = {
  accelerator:  number;
  isCustomized: boolean;
};

async function getAccelerator(): Promise<BenchmarkAcceleratorRow> {
  const row = await prisma.benchmarkAcceleratorConfig.findUnique({ where: { id: 1 } });
  return {
    accelerator:  row?.accelerator ?? TEAM_ACCELERATOR,
    isCustomized: !!row,
  };
}

async function upsertAccelerator(accelerator: number): Promise<BenchmarkAcceleratorRow> {
  await prisma.benchmarkAcceleratorConfig.upsert({
    where:  { id: 1 },
    update: { accelerator },
    create: { id: 1, accelerator },
  });
  return { accelerator, isCustomized: true };
}

async function resetAccelerator(): Promise<void> {
  await prisma.benchmarkAcceleratorConfig.deleteMany({ where: { id: 1 } });
}

export const benchmarkConfigService = {
  getAllRates,
  getEffectiveRates,
  upsertRate,
  resetRate,
  getAccelerator,
  upsertAccelerator,
  resetAccelerator,
};
