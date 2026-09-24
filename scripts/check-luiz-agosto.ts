import { PrismaClient } from "@prisma/client";
import { periodBounds } from "@/lib/statement/statementPeriod";
import { applyDeflator, COMBINED_FACTORS, HOURLY_RATES } from "@/lib/demand-pricing";
import type { ComplexityLevel, RoiLevel } from "@prisma/client";

const prisma = new PrismaClient();

const ROI_ORDER: RoiLevel[] = ["BAIXO", "MEDIO", "ALTO", "ESTRATEGICO"];

async function main() {
  const luiz = await prisma.user.findFirst({
    where: { name: { contains: "Luiz", mode: "insensitive" } },
    select: { id: true, name: true, workerProfile: true },
  });
  if (!luiz) { console.log("Luiz não encontrado"); return; }
  console.log(`Luiz: ${luiz.id} — ${luiz.name} | perfil: ${luiz.workerProfile}`);

  const { gte, lte } = periodBounds(8, 2026); // agosto: 16/07 → 15/08
  console.log(`\nCiclo agosto: ${gte.toISOString().slice(0,10)} → ${lte.toISOString().slice(0,10)}`);

  const demands = await prisma.demand.findMany({
    where: { assigneeId: luiz.id, actualDeliveryDate: { gte, lte } },
    select: {
      id: true, title: true,
      estimatedHours: true, complexity: true, roi: true,
      estimatedDemandValue: true,
      actualDeliveryDate: true, plannedDeliveryDate: true,
      assigneeProfileSnapshot: true, hourlyRateSnapshot: true,
    },
    orderBy: { estimatedDemandValue: "desc" },
  });

  const hourlyRate = luiz.workerProfile ? HOURLY_RATES[luiz.workerProfile] : 0;
  console.log(`\nValor/hora: R$${hourlyRate} | Demandas: ${demands.length}\n`);

  let total = 0;
  for (const d of demands) {
    const defResult = applyDeflator(d.estimatedDemandValue ?? 0, d.actualDeliveryDate, d.plannedDeliveryDate);
    const value = defResult.deflatedValue;
    total += value;
    const cf = d.complexity && d.roi ? COMBINED_FACTORS[d.complexity as ComplexityLevel]?.[d.roi as RoiLevel] : null;
    console.log(
      `  [${d.id.slice(-6).toUpperCase()}] ${d.title.slice(0, 50).padEnd(50)}` +
      ` | ${d.estimatedHours ?? 0}h | ${(d.complexity ?? "?").padEnd(7)} | ROI: ${(d.roi ?? "?").padEnd(11)}` +
      ` | fator: ${cf?.toFixed(1) ?? "?"} | R$${value.toFixed(2)}`
    );
  }

  console.log(`\nTotal atual: R$${total.toFixed(2)}`);
  console.log(`Meta:        R$13.412,00`);
  console.log(`Diferença:   R$${(13412 - total).toFixed(2)}`);

  // Simula o que aconteceria mudando ROI de cada demanda
  console.log(`\n--- Simulação de ajuste de ROI ---`);
  for (const d of demands) {
    if (!d.complexity || !d.estimatedHours) continue;
    const rate = (d.assigneeProfileSnapshot ? HOURLY_RATES[d.assigneeProfileSnapshot] : null) ?? hourlyRate;
    console.log(`\n  [${d.id.slice(-6).toUpperCase()}] ${d.title.slice(0,40)}`);
    for (const roi of ROI_ORDER) {
      const cf = COMBINED_FACTORS[d.complexity as ComplexityLevel][roi];
      const v = Math.round(rate * (d.estimatedHours ?? 0) * cf * 100) / 100;
      const marker = roi === d.roi ? " ← atual" : "";
      console.log(`    ROI ${roi.padEnd(11)}: fator ${cf.toFixed(1)} → R$${v.toFixed(2)}${marker}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
