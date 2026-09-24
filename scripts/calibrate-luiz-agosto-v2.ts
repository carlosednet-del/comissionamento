import { PrismaClient } from "@prisma/client";
import { periodBounds } from "@/lib/statement/statementPeriod";
import { applyDeflator, COMBINED_FACTORS, HOURLY_RATES } from "@/lib/demand-pricing";
import type { ComplexityLevel, RoiLevel } from "@prisma/client";

const prisma = new PrismaClient();
const TARGET = 13412;

async function main() {
  const luiz = await prisma.user.findFirst({
    where: { name: { contains: "Luiz", mode: "insensitive" } },
    select: { id: true, name: true, workerProfile: true },
  });
  if (!luiz) { console.log("Luiz não encontrado"); return; }

  const { gte, lte } = periodBounds(8, 2026);

  // Mesma query que o monthlyStatementService usa
  const demands = await prisma.demand.findMany({
    where: {
      assigneeId:         luiz.id,
      status:             "HOMOLOGADA_PRODUCAO",
      actualDeliveryDate: { gte, lte },
    },
    select: {
      id: true, title: true,
      estimatedHours: true, complexity: true, roi: true,
      estimatedDemandValue: true,
      actualDeliveryDate: true, plannedDeliveryDate: true,
      assigneeProfileSnapshot: true, hourlyRateSnapshot: true,
    },
    orderBy: { estimatedDemandValue: "desc" },
  });

  const defaultRate = luiz.workerProfile ? HOURLY_RATES[luiz.workerProfile] : 35;

  console.log(`\nLuiz Aquino — ciclo agosto/2026 (HOMOLOGADA_PRODUCAO): ${demands.length} demandas\n`);

  let total = 0;
  for (const d of demands) {
    const { deflatedValue } = applyDeflator(d.estimatedDemandValue ?? 0, d.actualDeliveryDate, d.plannedDeliveryDate);
    total += deflatedValue;
    const suffix = d.id.slice(-6).toUpperCase();
    console.log(`  [${suffix}] ${d.title.slice(0,45).padEnd(45)} | ${d.estimatedHours}h | ${(d.complexity??'?').padEnd(6)} | ${(d.roi??'?').padEnd(11)} | R$${deflatedValue.toFixed(2)}`);
  }

  console.log(`\nTotal atual:  R$${total.toFixed(2)}`);
  console.log(`Meta:         R$${TARGET.toFixed(2)}`);
  console.log(`Diferença:    R$${(total - TARGET).toFixed(2)} (${total > TARGET ? 'reduzir' : 'aumentar'})`);

  if (Math.abs(total - TARGET) < 50) {
    console.log("\n✓ Já está dentro de R$50 da meta. Nenhum ajuste necessário.");
    return;
  }

  // Calcula ajustes necessários
  console.log(`\n--- Ajustes para atingir ~R$${TARGET} ---`);
  const needed = total - TARGET; // positive = need to reduce

  // Candidatos a redução de ROI (MEDIO → BAIXO)
  const candidates = demands
    .filter(d => d.roi === "MEDIO" && d.complexity && d.estimatedHours)
    .map(d => {
      const rate = d.hourlyRateSnapshot ?? defaultRate;
      const { deflatedValue: curDef } = applyDeflator(d.estimatedDemandValue ?? 0, d.actualDeliveryDate, d.plannedDeliveryDate);
      const newVal = Math.round(rate * (d.estimatedHours ?? 0) * COMBINED_FACTORS[d.complexity as ComplexityLevel]["BAIXO"] * 100) / 100;
      const { deflatedValue: newDef } = applyDeflator(newVal, d.actualDeliveryDate, d.plannedDeliveryDate);
      return { id: d.id, suffix: d.id.slice(-6).toUpperCase(), title: d.title.slice(0, 35), curDef, newDef, newVal, delta: newDef - curDef };
    })
    .filter(c => c.delta < 0)
    .sort((a, b) => a.delta - b.delta); // most reduction first

  let accumulated = 0;
  const toChange: typeof candidates = [];
  for (const c of candidates) {
    if (needed <= 0) break; // need to increase, not reduce
    if (accumulated <= needed) {
      toChange.push(c);
      accumulated += Math.abs(c.delta);
      if (accumulated >= needed) break;
    }
  }

  if (toChange.length === 0 && needed > 0) {
    console.log("Não há demandas MEDIO para reduzir. Ajuste manual necessário.");
    return;
  }

  // Mostra plano
  for (const c of toChange) {
    console.log(`  [${c.suffix}] ${c.title.padEnd(35)} | MEDIO→BAIXO | R$${c.curDef.toFixed(2)} → R$${c.newDef.toFixed(2)} (delta: R$${c.delta.toFixed(2)})`);
  }
  const projectedTotal = total - accumulated;
  console.log(`\nTotal projetado: R$${projectedTotal.toFixed(2)} (diff da meta: R$${(projectedTotal - TARGET).toFixed(2)})`);

  // Aplica
  for (const c of toChange) {
    await prisma.demand.update({
      where: { id: c.id },
      data:  { roi: "BAIXO", estimatedDemandValue: c.newVal },
    });
    console.log(`  ✓ [${c.suffix}] → BAIXO, R$${c.newVal.toFixed(2)}`);
  }

  console.log(`\nConcluído.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
