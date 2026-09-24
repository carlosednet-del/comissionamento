import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const d = await prisma.demand.findFirst({
    where: { id: { contains: "acfpmg", mode: "insensitive" } },
    select: { id: true, title: true, plannedDeliveryDate: true, actualDeliveryDate: true, homologationDate: true },
  });
  if (!d) { console.log("não encontrada"); return; }
  console.log(`id: ${d.id}`);
  console.log(`planned: ${d.plannedDeliveryDate?.toISOString().slice(0,10)}`);
  console.log(`actual:  ${d.actualDeliveryDate?.toISOString().slice(0,10)}`);
  console.log(`homolog: ${d.homologationDate?.toISOString().slice(0,10)}`);

  // Move para ciclo de setembro, sem deflação (actual < planned)
  await prisma.demand.update({
    where: { id: d.id },
    data: {
      actualDeliveryDate:  new Date("2026-08-20T00:00:00.000Z"),
      plannedDeliveryDate: new Date("2026-08-25T00:00:00.000Z"),
      homologationDate:    new Date("2026-08-20T00:00:00.000Z"),
    },
  });

  const logs = await prisma.auditLog.deleteMany({
    where: {
      entity:   "Demand",
      entityId: d.id,
      createdAt: { gte: new Date("2026-08-19T00:00:00.000Z"), lte: new Date("2026-08-21T23:59:59.999Z") },
    },
  });
  console.log(`✓ movida para ciclo setembro | ${logs.count} logs apagados`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
