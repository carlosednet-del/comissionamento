import type { WorkerProfile } from "@prisma/client";

export const DEVELOPER_BENCHMARK_HOURLY_RATES: Record<WorkerProfile, number> = {
  JUNIOR:       120,
  PLENO:        150,
  SENIOR:       180,
  ESPECIALISTA: 210,
};

export const TEAM_ACCELERATOR = 20;
