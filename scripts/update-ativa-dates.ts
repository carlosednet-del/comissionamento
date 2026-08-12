import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.demand.update({
    where: { id: "cmsote94f0001zjm6kray4gtd" },
    data: {
      plannedStartDate:    new Date("2026-08-11T00:00:00.000Z"),
      plannedDeliveryDate: new Date("2026-09-18T00:00:00.000Z"),
    },
    select: { id: true, title: true, plannedStartDate: true, plannedDeliveryDate: true },
  });
  console.log("✓", updated.title);
  console.log("  Start:   ", updated.plannedStartDate?.toISOString().slice(0, 10));
  console.log("  Entrega: ", updated.plannedDeliveryDate?.toISOString().slice(0, 10));
}

main().catch(console.error).finally(() => prisma.$disconnect());
