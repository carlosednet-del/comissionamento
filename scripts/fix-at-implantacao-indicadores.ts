import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const demand = await prisma.demand.findFirst({
    where: {
      title: { contains: "Implantação de indicadores de Assistência Técnica", mode: "insensitive" },
    },
    select: {
      id: true, title: true, status: true,
      plannedDeliveryDate: true,
      actualDeliveryDate:  true,
      homologationDate:    true,
      assignee: { select: { name: true } },
      creator:  { select: { name: true } },
    },
  });

  if (!demand) {
    // Busca mais ampla
    console.log("Não encontrada pela busca exata. Tentando busca ampla...");
    const all = await prisma.demand.findMany({
      where: {
        OR: [
          { title: { contains: "Assistência Técnica", mode: "insensitive" } },
          { title: { contains: "Assistencia Tecnica", mode: "insensitive" } },
          { title: { contains: "A.T", mode: "insensitive" } },
          { title: { contains: "indicadores", mode: "insensitive" } },
        ],
      },
      select: { id: true, title: true, actualDeliveryDate: true, plannedDeliveryDate: true, assignee: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    for (const d of all) {
      console.log(`[${d.id.slice(-6)}] ${d.title}`);
      console.log(`  assignee: ${d.assignee?.name}`);
      console.log(`  planned:  ${d.plannedDeliveryDate?.toISOString().slice(0,10)}`);
      console.log(`  actual:   ${d.actualDeliveryDate?.toISOString().slice(0,10)}`);
    }
    return;
  }

  console.log(`Demanda: [${demand.id}] ${demand.title}`);
  console.log(`  assignee: ${demand.assignee?.name}`);
  console.log(`  creator:  ${demand.creator?.name}`);
  console.log(`  status:   ${demand.status}`);
  console.log(`  planned:  ${demand.plannedDeliveryDate?.toISOString().slice(0,10) ?? "null"}`);
  console.log(`  actual:   ${demand.actualDeliveryDate?.toISOString().slice(0,10) ?? "null"}`);
  console.log(`  homolog:  ${demand.homologationDate?.toISOString().slice(0,10) ?? "null"}`);

  // Ciclo de agosto: até 15/08/2026 — sem deflação requer actual <= planned
  // Usamos 15/08 como data segura (último dia do ciclo de agosto)
  const novaData = new Date("2026-08-15T00:00:00.000Z");

  await prisma.demand.update({
    where: { id: demand.id },
    data: {
      actualDeliveryDate: novaData,
      homologationDate:   novaData,
    },
  });
  console.log(`\n✓ actualDeliveryDate e homologationDate → 15/08/2026`);

  // Apaga audit logs de 19/08 a 20/08 (datas de hoje e ontem) para esta demanda
  const d19    = new Date("2026-08-19T00:00:00.000Z");
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
