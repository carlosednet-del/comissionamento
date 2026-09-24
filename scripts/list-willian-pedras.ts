import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const demands = await prisma.demand.findMany({
    where: {
      isPedra: true,
      assignee: { name: { contains: "Willian", mode: "insensitive" } },
    },
    select: {
      title: true,
      plannedStartDate: true,
      plannedDeliveryDate: true,
    },
    orderBy: { plannedStartDate: "asc" },
  });

  console.log(`${demands.length} pedras do Willian:\n`);
  demands.forEach((d, i) => {
    const start    = d.plannedStartDate?.toISOString().slice(0, 10) ?? "—";
    const delivery = d.plannedDeliveryDate?.toISOString().slice(0, 10) ?? "—";
    console.log(`${i + 1}. ${d.title}`);
    console.log(`   ${start} → ${delivery}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
