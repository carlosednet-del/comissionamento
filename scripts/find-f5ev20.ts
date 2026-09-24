import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Busca todas demandas do Luciano com actualDeliveryDate recente
  const luciano = await prisma.user.findFirst({
    where: { name: { contains: "Luciano", mode: "insensitive" } },
    select: { id: true, name: true },
  });
  console.log("Luciano:", luciano?.id, luciano?.name);

  const demands = await prisma.demand.findMany({
    where: {
      assigneeId: luciano?.id,
      actualDeliveryDate: { gte: new Date("2026-08-18"), lte: new Date("2026-08-21") },
    },
    select: { id: true, title: true, plannedDeliveryDate: true, actualDeliveryDate: true, homologationDate: true },
    orderBy: { createdAt: "desc" },
  });
  console.log(`\n${demands.length} demandas com actual em 18-21/08:`);
  for (const d of demands) {
    console.log(`  [${d.id.slice(-6)}] ${d.title}`);
    console.log(`    planned: ${d.plannedDeliveryDate?.toISOString().slice(0,10)} | actual: ${d.actualDeliveryDate?.toISOString().slice(0,10)}`);
  }

  // Busca por título
  const cr = await prisma.demand.findMany({
    where: { title: { contains: "Contas", mode: "insensitive" } },
    select: { id: true, title: true, actualDeliveryDate: true, assignee: { select: { name: true } } },
  });
  console.log(`\nPor 'Contas': ${cr.length}`);
  for (const d of cr) console.log(`  [${d.id.slice(-6)}] ${d.title} | ${d.assignee?.name} | ${d.actualDeliveryDate?.toISOString().slice(0,10)}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
