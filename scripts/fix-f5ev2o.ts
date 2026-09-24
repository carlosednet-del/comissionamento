import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const demand = await prisma.demand.findFirst({
    where: {
      title: { contains: "Contas a Receber", mode: "insensitive" },
      assignee: { name: { contains: "Luciano", mode: "insensitive" } },
    },
    select: { id: true, title: true, plannedDeliveryDate: true, actualDeliveryDate: true },
  });
  if (!demand) { console.log("não encontrada"); return; }

  console.log(`[${demand.id.slice(-6)}] ${demand.title}`);
  console.log(`  planned: ${demand.plannedDeliveryDate?.toISOString().slice(0,10)}`);
  console.log(`  actual antes: ${demand.actualDeliveryDate?.toISOString().slice(0,10)}`);

  const novaData = new Date("2026-08-15T00:00:00.000Z");
  await prisma.demand.update({
    where: { id: demand.id },
    data: { actualDeliveryDate: novaData, homologationDate: novaData },
  });

  const logs = await prisma.auditLog.deleteMany({
    where: {
      entity: "Demand",
      entityId: demand.id,
      createdAt: { gte: new Date("2026-08-19T00:00:00.000Z"), lte: new Date("2026-08-20T23:59:59.999Z") },
    },
  });

  console.log(`✓ actual/homolog → 15/08/2026 | ${logs.count} logs apagados`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
