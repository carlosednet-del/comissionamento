/**
 * One-off migration: normalise WorkerProfile values before removing
 * SUPORTE_* and ARQUITETO_* variants from the enum.
 *
 * Maps each old variant to the equivalent tier (JUNIOR/PLENO/SENIOR/ESPECIALISTA).
 * Applies to both the `users."workerProfile"` column and
 * `demands."assigneeProfileSnapshot"`.
 *
 * Run once with:  npx tsx scripts/migrate-worker-profiles.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // ── users."workerProfile" ──────────────────────────────────────
  const userMappings: Array<{ from: string; to: string }> = [
    { from: "SUPORTE_JUNIOR",         to: "JUNIOR"       },
    { from: "SUPORTE_PLENO",          to: "PLENO"        },
    { from: "SUPORTE_SENIOR",         to: "SENIOR"       },
    { from: "SUPORTE_ESPECIALISTA",   to: "ESPECIALISTA" },
    { from: "ARQUITETO_JUNIOR",       to: "JUNIOR"       },
    { from: "ARQUITETO_PLENO",        to: "PLENO"        },
    { from: "ARQUITETO_SENIOR",       to: "SENIOR"       },
    { from: "ARQUITETO_ESPECIALISTA", to: "ESPECIALISTA" },
  ];

  for (const { from, to } of userMappings) {
    const result = await prisma.$executeRawUnsafe(
      `UPDATE users SET "workerProfile" = $1::"WorkerProfile" WHERE "workerProfile"::text = $2`,
      to,
      from,
    );
    if (result > 0) console.log(`users: ${from} → ${to} (${result} rows)`);
  }

  // ── demands."assigneeProfileSnapshot" ─────────────────────────
  for (const { from, to } of userMappings) {
    const result = await prisma.$executeRawUnsafe(
      `UPDATE demands SET "assigneeProfileSnapshot" = $1::"WorkerProfile" WHERE "assigneeProfileSnapshot"::text = $2`,
      to,
      from,
    );
    if (result > 0) console.log(`demands: ${from} → ${to} (${result} rows)`);
  }

  console.log("✅  Migration complete");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
