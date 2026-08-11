import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { name: { contains: "Robert", mode: "insensitive" } },
    select: { id: true, name: true },
  });

  if (!user) { console.log("Usuário não encontrado"); return; }
  console.log("Usuário:", user.name, user.id);

  const demands = await prisma.demand.findMany({
    where: {
      assigneeId: user.id,
      actualDeliveryDate:  { not: null },
      plannedDeliveryDate: { not: null },
    },
    select: {
      id: true,
      title: true,
      status: true,
      plannedDeliveryDate: true,
      actualDeliveryDate: true,
    },
    orderBy: { plannedDeliveryDate: "asc" },
  });

  const deflated = demands.filter(
    d => d.actualDeliveryDate! > d.plannedDeliveryDate!
  );

  console.log(`\nTotal demandas com datas: ${demands.length}`);
  console.log(`Deflacionadas (actual > planned): ${deflated.length}\n`);

  for (const d of deflated) {
    console.log(`ID: ${d.id}`);
    console.log(`  Título:  ${d.title}`);
    console.log(`  Status:  ${d.status}`);
    console.log(`  Planned: ${d.plannedDeliveryDate?.toISOString().slice(0,10)}`);
    console.log(`  Actual:  ${d.actualDeliveryDate?.toISOString().slice(0,10)}`);
    console.log("");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
