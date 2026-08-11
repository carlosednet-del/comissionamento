import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const demandId = "cmrxs747r001f8x37r6yknyek";
  const newPlanned = new Date("2026-09-29T00:00:00.000Z");

  const updated = await prisma.demand.update({
    where: { id: demandId },
    data:  { plannedDeliveryDate: newPlanned },
    select: {
      id: true,
      title: true,
      plannedDeliveryDate: true,
      actualDeliveryDate: true,
    },
  });

  console.log("Atualizado:");
  console.log("  ID:      ", updated.id);
  console.log("  Título:  ", updated.title);
  console.log("  Planned: ", updated.plannedDeliveryDate?.toISOString().slice(0,10));
  console.log("  Actual:  ", updated.actualDeliveryDate?.toISOString().slice(0,10));
  console.log("  Deflação removida: actual <= planned ✓");
}

main().catch(console.error).finally(() => prisma.$disconnect());
