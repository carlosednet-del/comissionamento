import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const { count } = await prisma.demand.updateMany({
    where: { assigneeId: "cmpr03of90007c1bnfuvufe5b" },
    data:  { status: "EM_DESENVOLVIMENTO" },
  });
  console.log(`✓ ${count} demandas do Hildo Sousa → EM_DESENVOLVIMENTO`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
