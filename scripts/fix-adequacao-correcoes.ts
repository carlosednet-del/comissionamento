import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const d = await prisma.demand.findFirst({
    where: { title: { contains: "Adequação e Correções Críticas", mode: "insensitive" } },
    select: { id: true, title: true, plannedDeliveryDate: true },
  });
  if (!d) { console.log("não encontrada"); return; }
  console.log(`Encontrada: ${d.title}`);

  await prisma.demand.update({
    where: { id: d.id },
    data: {
      title:               "Adequação e Correções Críticas — Sede",
      plannedDeliveryDate: new Date("2026-09-30T00:00:00.000Z"),
    },
  });
  console.log(`✓ título → "Adequação e Correções Críticas — Sede"`);
  console.log(`✓ entrega → 2026-09-30`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
