import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const IDS = [
  "cmsov99v80000107peedj9emr",
  "cmsov9ate0001107p5tkcba81",
  "cmsov9br10002107phqd06k7i",
  "cmsov9cp30003107pvlxjh9i4",
  "cmsov9dn90004107pzkn2gr6u",
  "cmsov9el40005107pb6ew8xrg",
  "cmsov9fjh0006107puly185om",
  "cmsov9ggq0007107p40g0ld5h",
];

async function main() {
  const { count } = await prisma.demand.updateMany({
    where: { id: { in: IDS } },
    data:  { assigneeId: "cmpphurah000394sthimulf72" },
  });
  console.log(`✓ ${count} demandas atribuídas a Renato Duarte`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
