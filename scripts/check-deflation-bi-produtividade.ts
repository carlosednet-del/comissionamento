import { PrismaClient } from "@prisma/client";
import { applyDeflator } from "@/lib/demand-pricing";
const prisma = new PrismaClient();

async function main() {
  const demand = await prisma.demand.findFirst({
    where: { title: { contains: "Finalizar BI de Produtividade", mode: "insensitive" } },
    select: {
      id: true, title: true,
      estimatedDemandValue: true,
      plannedDeliveryDate: true,
      actualDeliveryDate: true,
    },
  });
  if (!demand) { console.log("Demanda não encontrada"); return; }

  console.log("Demanda:", demand.title);
  console.log("Valor original:", demand.estimatedDemandValue);
  console.log("Planned:       ", demand.plannedDeliveryDate?.toISOString());
  console.log("Actual:        ", demand.actualDeliveryDate?.toISOString());

  const result = applyDeflator(
    demand.estimatedDemandValue ?? 0,
    demand.actualDeliveryDate,
    demand.plannedDeliveryDate,
  );
  console.log("\nResultado applyDeflator:");
  console.log("  isLate:         ", result.isLate);
  console.log("  workingDaysLate:", result.workingDaysLate);
  console.log("  factor:         ", result.factor);
  console.log("  originalValue:  ", result.originalValue);
  console.log("  deflatedValue:  ", result.deflatedValue);
}

main().catch(console.error).finally(() => prisma.$disconnect());
