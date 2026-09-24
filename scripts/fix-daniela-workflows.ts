import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const DEMAND_ID = "cmr3cq7gj0000el886vabcxyz"; // será substituído abaixo

async function main() {
  const demand = await prisma.demand.findFirst({
    where: { title: { contains: "Ajustes workflows Luana", mode: "insensitive" } },
    select: { id: true, title: true, actualDeliveryDate: true, plannedDeliveryDate: true },
  });
  if (!demand) { console.log("Demanda não encontrada"); return; }
  console.log(`Demanda: [${demand.id}] ${demand.title}`);
  console.log(`  actual antes: ${demand.actualDeliveryDate?.toISOString().slice(0,10)}`);

  // Último dia do ciclo de agosto
  const novaData = new Date("2026-08-15T00:00:00.000Z");

  await prisma.demand.update({
    where: { id: demand.id },
    data: {
      actualDeliveryDate: novaData,
      homologationDate:   novaData,
    },
  });
  console.log(`✓ actualDeliveryDate e homologationDate ajustados para 15/08/2026`);

  // Apaga audit logs de hoje e de 19/08 para esta demanda
  const d19 = new Date("2026-08-19T00:00:00.000Z");
  const d20fim = new Date("2026-08-20T23:59:59.999Z");

  const deleted = await prisma.auditLog.deleteMany({
    where: {
      entity:    "Demand",
      entityId:  demand.id,
      createdAt: { gte: d19, lte: d20fim },
    },
  });
  console.log(`✓ ${deleted.count} audit logs de 19-20/08 apagados`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
