import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Busca demandas criadas por Daniela Rodrigues em 19/08/2026
  const daniela = await prisma.user.findFirst({
    where: { name: { contains: "Daniela", mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (!daniela) { console.log("Daniela não encontrada"); return; }
  console.log(`Daniela: ${daniela.id} — ${daniela.name}`);

  const inicio = new Date("2026-08-19T00:00:00.000Z");
  const fim    = new Date("2026-08-19T23:59:59.999Z");

  const demands = await prisma.demand.findMany({
    where: {
      creatorId: daniela.id,
      createdAt: { gte: inicio, lte: fim },
      OR: [
        { title: { contains: "Luana",  mode: "insensitive" } },
        { title: { contains: "Laís",   mode: "insensitive" } },
        { title: { contains: "Lais",   mode: "insensitive" } },
        { title: { contains: "Lara",   mode: "insensitive" } },
        { title: { contains: "Luiza",  mode: "insensitive" } },
        { title: { contains: "workflow", mode: "insensitive" } },
        { title: { contains: "Ajuste", mode: "insensitive" } },
      ],
    },
    select: {
      id: true, title: true, status: true,
      plannedDeliveryDate: true,
      actualDeliveryDate:  true,
      homologationDate:    true,
      assignee: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`\nDemandas encontradas: ${demands.length}`);
  for (const d of demands) {
    console.log(`\n  [${d.id.slice(-6)}] ${d.title}`);
    console.log(`    status:   ${d.status}`);
    console.log(`    assignee: ${d.assignee?.name ?? "sem responsável"}`);
    console.log(`    planned:  ${d.plannedDeliveryDate?.toISOString().slice(0,10) ?? "null"}`);
    console.log(`    actual:   ${d.actualDeliveryDate?.toISOString().slice(0,10) ?? "null"}`);
    console.log(`    homolog:  ${d.homologationDate?.toISOString().slice(0,10) ?? "null"}`);
  }

  // Busca mais ampla se não encontrar nada
  if (demands.length === 0) {
    console.log("\nBusca ampla — todas criadas por Daniela em 19/08:");
    const all = await prisma.demand.findMany({
      where: { creatorId: daniela.id, createdAt: { gte: inicio, lte: fim } },
      select: { id: true, title: true, status: true, actualDeliveryDate: true },
      orderBy: { createdAt: "asc" },
    });
    for (const d of all) {
      console.log(`  [${d.id.slice(-6)}] ${d.title} | actual: ${d.actualDeliveryDate?.toISOString().slice(0,10) ?? "null"}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
