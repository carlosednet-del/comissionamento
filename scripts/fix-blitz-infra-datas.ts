import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const d = await prisma.demand.findFirst({
    where: { title: { contains: "Blitz de Infraestrutura", mode: "insensitive" } },
    select: { id: true, title: true },
  });
  if (!d) { console.log("não encontrada"); return; }

  await prisma.demand.update({
    where: { id: d.id },
    data: {
      plannedStartDate:    new Date("2026-09-15T00:00:00.000Z"),
      plannedDeliveryDate: new Date("2026-09-28T00:00:00.000Z"),
    },
  });
  console.log(`✓ ${d.title}`);
  console.log(`  2026-09-15 → 2026-09-28`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
