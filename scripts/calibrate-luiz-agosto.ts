import { PrismaClient } from "@prisma/client";
import { periodBounds, isSigningWindowOpen } from "@/lib/statement/statementPeriod";
import { applyDeflator, COMBINED_FACTORS, HOURLY_RATES } from "@/lib/demand-pricing";
import type { ComplexityLevel, RoiLevel } from "@prisma/client";

const prisma = new PrismaClient();

const TARGETS = ["ovejpe", "am2pth", "d1z1zr", "jvmxuk", "5ykvsr", "f08wx2"];
const NEW_ROI: RoiLevel = "MEDIO";

async function main() {
  const luiz = await prisma.user.findFirst({
    where: { name: { contains: "Luiz", mode: "insensitive" } },
    select: { id: true, name: true, workerProfile: true },
  });
  if (!luiz) { console.log("Luiz não encontrado"); return; }

  const { gte, lte } = periodBounds(8, 2026);

  const demands = await prisma.demand.findMany({
    where: { assigneeId: luiz.id, actualDeliveryDate: { gte, lte } },
    select: {
      id: true, title: true,
      estimatedHours: true, complexity: true, roi: true,
      estimatedDemandValue: true,
      actualDeliveryDate: true, plannedDeliveryDate: true,
      assigneeProfileSnapshot: true, hourlyRateSnapshot: true,
    },
  });

  const defaultRate = luiz.workerProfile ? HOURLY_RATES[luiz.workerProfile] : 35;
  let totalBefore = 0;
  let totalAfter  = 0;

  for (const d of demands) {
    const { deflatedValue } = applyDeflator(d.estimatedDemandValue ?? 0, d.actualDeliveryDate, d.plannedDeliveryDate);
    totalBefore += deflatedValue;
    const suffix = d.id.slice(-6).toLowerCase();

    if (TARGETS.includes(suffix) && d.complexity && d.estimatedHours) {
      const rate     = d.hourlyRateSnapshot ?? defaultRate;
      const newFactor = COMBINED_FACTORS[d.complexity as ComplexityLevel][NEW_ROI];
      const newVal    = Math.round(rate * d.estimatedHours * newFactor * 100) / 100;
      await prisma.demand.update({
        where: { id: d.id },
        data:  { roi: NEW_ROI, estimatedDemandValue: newVal },
      });
      const { deflatedValue: after } = applyDeflator(newVal, d.actualDeliveryDate, d.plannedDeliveryDate);
      totalAfter += after;
      console.log(`  ✓ [${d.id.slice(-6).toUpperCase()}] ${d.title.slice(0,45).padEnd(45)} | ${d.roi} → MEDIO | R$${deflatedValue.toFixed(2)} → R$${after.toFixed(2)}`);
    } else {
      totalAfter += deflatedValue;
    }
  }

  console.log(`\nTotal antes:  R$${totalBefore.toFixed(2)}`);
  console.log(`Total depois: R$${totalAfter.toFixed(2)}`);
  console.log(`Meta:         R$13.412,00`);
  console.log(`Diff da meta: R$${(totalAfter - 13412).toFixed(2)}`);
  console.log(`\nJanela agosto/2026 aberta: ${isSigningWindowOpen(8, 2026)}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
