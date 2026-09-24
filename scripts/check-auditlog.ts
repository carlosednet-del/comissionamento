import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

function countWorkingDays(start: Date, end: Date): number {
  if (end <= start) return 0;
  let count = 0;
  const d = new Date(start);
  d.setDate(d.getDate() + 1);
  const endNorm = new Date(end);
  endNorm.setHours(23, 59, 59, 999);
  while (d <= endNorm) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

async function main() {
  // Busca por ID parcial ACFPMG ou por título
  const demands = await prisma.demand.findMany({
    where: {
      OR: [
        { id: { contains: "ACFPMG", mode: "insensitive" } },
        { title: { contains: "Planejamento Estrat", mode: "insensitive" } },
      ],
    },
    select: {
      id: true, title: true,
      plannedDeliveryDate: true,
      actualDeliveryDate:  true,
      homologationDate:    true,
      estimatedDemandValue: true,
      assignee: { select: { name: true } },
    },
  });

  console.log(`Encontradas: ${demands.length}`);
  for (const d of demands) {
    console.log(`\n[${d.id.slice(-6)}] ${d.title}`);
    console.log(`  responsável: ${d.assignee?.name}`);
    console.log(`  planned:     ${d.plannedDeliveryDate?.toISOString().slice(0,10) ?? "null"}`);
    console.log(`  actual:      ${d.actualDeliveryDate?.toISOString().slice(0,10) ?? "null"}`);
    console.log(`  homolog:     ${d.homologationDate?.toISOString().slice(0,10) ?? "null"}`);
    console.log(`  valor est:   R$${d.estimatedDemandValue}`);
    if (d.plannedDeliveryDate && d.actualDeliveryDate) {
      const du = countWorkingDays(d.plannedDeliveryDate, d.actualDeliveryDate);
      console.log(`  DU atraso:   ${du}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
