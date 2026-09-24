import { PrismaClient } from "@prisma/client";
import { periodBounds } from "@/lib/statement/statementPeriod";
import { applyDeflator } from "@/lib/demand-pricing";

const prisma = new PrismaClient();

async function main() {
  const { gte, lte } = periodBounds(8, 2026);
  console.log(`Período: ${gte.toISOString().slice(0, 10)} → ${lte.toISOString().slice(0, 10)}\n`);

  for (const suffix of ["eb083y", "8947lo"]) {
    const d = await prisma.demand.findFirst({
      where: { id: { endsWith: suffix } },
      select: {
        id: true, title: true, status: true, roi: true, complexity: true,
        estimatedHours: true, estimatedDemandValue: true,
        actualDeliveryDate: true, plannedDeliveryDate: true,
        hourlyRateSnapshot: true, assigneeId: true,
      },
    });
    if (!d) { console.log(`[${suffix.toUpperCase()}] not found`); continue; }
    const inPeriod = d.actualDeliveryDate && d.actualDeliveryDate >= gte && d.actualDeliveryDate <= lte;
    const { deflatedValue, factor } = applyDeflator(d.estimatedDemandValue ?? 0, d.actualDeliveryDate, d.plannedDeliveryDate);
    console.log(`[${suffix.toUpperCase()}] ${d.title.slice(0, 50)}`);
    console.log(`  status:      ${d.status}`);
    console.log(`  actualDel:   ${d.actualDeliveryDate?.toISOString()?.slice(0, 10) ?? "null"} (in period: ${inPeriod})`);
    console.log(`  plannedDel:  ${d.plannedDeliveryDate?.toISOString()?.slice(0, 10) ?? "null"}`);
    console.log(`  estimatedVal: R$${d.estimatedDemandValue?.toFixed(2) ?? "null"}`);
    console.log(`  deflFactor:  ${factor}`);
    console.log(`  deflatedVal: R$${deflatedValue.toFixed(2)}`);
    console.log(`  roi: ${d.roi} | complexity: ${d.complexity} | hours: ${d.estimatedHours}`);
    console.log();
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
