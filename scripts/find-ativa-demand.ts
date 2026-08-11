import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const hildo = await prisma.demand.findMany({
    where: {
      assigneeId: "cmpr03of90007c1bnfuvufe5b",
      OR: [
        { plannedStartDate: null },
        { title: { contains: "A.TI.VA", mode: "insensitive" } },
        { title: { contains: "Ativos", mode: "insensitive" } },
        { title: { contains: "Implanta", mode: "insensitive" } },
      ],
    },
    select: { id: true, title: true, plannedStartDate: true, plannedDeliveryDate: true },
  });
  console.log(JSON.stringify(hildo, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
