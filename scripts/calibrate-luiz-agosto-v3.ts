import { PrismaClient } from "@prisma/client";
import { periodBounds } from "@/lib/statement/statementPeriod";
import { applyDeflator, COMBINED_FACTORS, HOURLY_RATES } from "@/lib/demand-pricing";
import type { ComplexityLevel } from "@prisma/client";

const prisma = new PrismaClient();
const TARGET = 13412;
const TOLERANCE = 50;

async function main() {
  const luiz = await prisma.user.findFirst({
    where: { name: { contains: "Luiz", mode: "insensitive" } },
    select: { id: true, name: true, workerProfile: true },
  });
  if (!luiz) { console.log("Luiz não encontrado"); return; }

  const { gte, lte } = periodBounds(8, 2026);

  const demands = await prisma.demand.findMany({
    where: {
      assigneeId: luiz.id,
      status: "HOMOLOGADA_PRODUCAO",
      actualDeliveryDate: { gte, lte },
    },
    select: {
      id: true, title: true,
      estimatedHours: true, complexity: true, roi: true,
      estimatedDemandValue: true,
      actualDeliveryDate: true, plannedDeliveryDate: true,
      hourlyRateSnapshot: true,
    },
    orderBy: { estimatedDemandValue: "desc" },
  });

  const defaultRate = luiz.workerProfile ? HOURLY_RATES[luiz.workerProfile] : 35;

  let total = 0;
  const rows: Array<typeof demands[0] & { deflatedValue: number }> = [];

  for (const d of demands) {
    const { deflatedValue } = applyDeflator(
      d.estimatedDemandValue ?? 0,
      d.actualDeliveryDate,
      d.plannedDeliveryDate,
    );
    total += deflatedValue;
    rows.push({ ...d, deflatedValue });
  }

  console.log(`\nLuiz — ciclo agosto/2026 (HOMOLOGADA_PRODUCAO): ${demands.length} demandas\n`);
  for (const d of rows) {
    console.log(
      `  [${d.id.slice(-6).toUpperCase()}] ${d.title.slice(0, 40).padEnd(40)}` +
      ` | ${d.estimatedHours}h | ${(d.complexity ?? "?").padEnd(6)}` +
      ` | ${(d.roi ?? "?").padEnd(11)} | R$${d.deflatedValue.toFixed(2)}`,
    );
  }

  console.log(`\nTotal atual:  R$${total.toFixed(2)}`);
  console.log(`Meta:         R$${TARGET.toFixed(2)}`);
  console.log(`Diferença:    R$${(total - TARGET).toFixed(2)} (${total > TARGET ? "reduzir" : "aumentar"})`);

  if (Math.abs(total - TARGET) <= TOLERANCE) {
    console.log(`\n✓ Dentro de R$${TOLERANCE} da meta. Nenhum ajuste necessário.`);
    return;
  }

  const needed = total - TARGET;

  if (needed <= 0) {
    console.log("\nTotal abaixo da meta — ajuste manual necessário.");
    return;
  }

  // Candidates MEDIO→BAIXO sorted by biggest reduction first
  const candidates = rows
    .filter((d) => d.roi === "MEDIO" && d.complexity && d.estimatedHours)
    .map((d) => {
      const rate = d.hourlyRateSnapshot ?? defaultRate;
      const newVal =
        Math.round(rate * (d.estimatedHours ?? 0) * COMBINED_FACTORS[d.complexity as ComplexityLevel]["BAIXO"] * 100) / 100;
      const { deflatedValue: newDef } = applyDeflator(newVal, d.actualDeliveryDate, d.plannedDeliveryDate);
      const delta = newDef - d.deflatedValue;
      return {
        id: d.id,
        suffix: d.id.slice(-6).toUpperCase(),
        title: d.title.slice(0, 35),
        curDef: d.deflatedValue,
        newDef,
        newVal,
        delta,
      };
    })
    .filter((c) => c.delta < 0)
    .sort((a, b) => a.delta - b.delta);

  let accumulated = 0;
  const toChange: typeof candidates = [];
  for (const c of candidates) {
    if (accumulated >= needed) break;
    toChange.push(c);
    accumulated += Math.abs(c.delta);
  }

  if (toChange.length === 0) {
    console.log("\nNão há candidatos MEDIO para reduzir. Ajuste manual necessário.");
    return;
  }

  console.log(`\n--- Ajustes MEDIO→BAIXO ---`);
  for (const c of toChange) {
    console.log(
      `  [${c.suffix}] ${c.title.padEnd(35)}` +
      ` | MEDIO→BAIXO | R$${c.curDef.toFixed(2)} → R$${c.newDef.toFixed(2)} (Δ R$${c.delta.toFixed(2)})`,
    );
  }

  const projected = total - accumulated;
  console.log(`\nTotal projetado: R$${projected.toFixed(2)} (diff da meta: R$${(projected - TARGET).toFixed(2)})`);

  for (const c of toChange) {
    await prisma.demand.update({
      where: { id: c.id },
      data: { roi: "BAIXO", estimatedDemandValue: c.newVal },
    });
    console.log(`  ✓ [${c.suffix}] → BAIXO, R$${c.newVal.toFixed(2)}`);
  }

  console.log(`\nConcluído.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
