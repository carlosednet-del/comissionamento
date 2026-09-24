import { PrismaClient } from "@prisma/client";
import { COMBINED_FACTORS, HOURLY_RATES } from "@/lib/demand-pricing";
import type { ComplexityLevel } from "@prisma/client";

const prisma = new PrismaClient();

// Use UTC dates to match production server behavior (Vercel runs in UTC)
const GTE = new Date("2026-07-16T00:00:00.000Z");
const LTE = new Date("2026-08-15T23:59:59.999Z");

async function main() {
  const luiz = await prisma.user.findFirst({
    where: { name: { contains: "Luiz", mode: "insensitive" } },
    select: { id: true, workerProfile: true },
  });
  if (!luiz) { console.log("Luiz não encontrado"); return; }

  const defaultRate = luiz.workerProfile ? HOURLY_RATES[luiz.workerProfile] : 35;

  // Query with UTC dates — matches production behavior
  const demands = await prisma.demand.findMany({
    where: {
      assigneeId: luiz.id,
      status: "HOMOLOGADA_PRODUCAO",
      actualDeliveryDate: { gte: GTE, lte: LTE },
    },
    select: {
      id: true, title: true, complexity: true, roi: true,
      estimatedHours: true, estimatedDemandValue: true,
      actualDeliveryDate: true, plannedDeliveryDate: true,
      hourlyRateSnapshot: true,
    },
    orderBy: { estimatedDemandValue: "desc" },
  });

  console.log(`\nLuiz — ciclo agosto/2026 (UTC, HOMOLOGADA_PRODUCAO): ${demands.length} demandas`);

  // Show current state
  let total = 0;
  for (const d of demands) {
    const val = d.estimatedDemandValue ?? 0;
    total += val;
    console.log(`  [${d.id.slice(-6).toUpperCase()}] ${d.title.slice(0, 40).padEnd(40)} | ${(d.roi ?? "?").padEnd(11)} | R$${val.toFixed(2)}`);
  }
  console.log(`\nTotal (estimatedDemandValue, sem deflação): R$${total.toFixed(2)}`);
  console.log(`\n(Nota: produção aplica deflação e exibe ~R$15.382,20 considerando 8947LO com factor≈-0.9)`);

  // Demands to reduce MEDIO→BAIXO
  // Targeting only on-time demands (factor=1) where the UI total contribution equals estimatedDemandValue
  const SKIP_SUFFIXES = new Set(["8947lo", "k2gom6", "xfeozg", "ggburd", "f08wx2"]);

  const candidates = demands.filter(
    (d) => d.roi === "MEDIO" && d.complexity && d.estimatedHours && !SKIP_SUFFIXES.has(d.id.slice(-6).toLowerCase()),
  );

  let totalReduction = 0;
  const updates: Array<{ id: string; suffix: string; newVal: number; oldVal: number; delta: number }> = [];

  for (const d of candidates) {
    const rate = d.hourlyRateSnapshot ?? defaultRate;
    const newVal = Math.round(rate * (d.estimatedHours ?? 0) * COMBINED_FACTORS[d.complexity as ComplexityLevel]["BAIXO"] * 100) / 100;
    const delta = newVal - (d.estimatedDemandValue ?? 0);
    totalReduction += delta;
    updates.push({ id: d.id, suffix: d.id.slice(-6).toUpperCase(), newVal, oldVal: d.estimatedDemandValue ?? 0, delta });
  }

  console.log(`\n--- Ajustes MEDIO→BAIXO ---`);
  for (const u of updates) {
    console.log(`  [${u.suffix}] R$${u.oldVal.toFixed(2)} → R$${u.newVal.toFixed(2)} (Δ R$${u.delta.toFixed(2)})`);
  }

  // Projected production total: 15382.20 + totalReduction (8947LO stays as-is in production)
  const projected = 15382.20 + totalReduction;
  console.log(`\nRedução total: R$${totalReduction.toFixed(2)}`);
  console.log(`Total projetado (produção): R$${projected.toFixed(2)}`);
  console.log(`Meta: R$13.412,00 | Diff: R$${(projected - 13412).toFixed(2)}`);

  if (Math.abs(projected - 13412) > 200) {
    console.log("\nDiff > R$200, revisando candidatos...");
    return;
  }

  // Apply changes
  for (const u of updates) {
    await prisma.demand.update({
      where: { id: u.id },
      data: { roi: "BAIXO", estimatedDemandValue: u.newVal },
    });
    console.log(`  ✓ [${u.suffix}] → BAIXO R$${u.newVal.toFixed(2)}`);
  }

  console.log(`\nConcluído.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
