import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const TITULOS = [
  "Diagnóstico",
  "Blitz de Infraestrutura",
  "Adequação e Correções Críticas",
];

async function main() {
  for (const termo of TITULOS) {
    const demands = await prisma.demand.findMany({
      where: { title: { contains: termo, mode: "insensitive" } },
      select: {
        id: true, title: true,
        plannedStartDate: true, plannedDeliveryDate: true,
        actualStartDate: true, actualDeliveryDate: true,
        status: true,
      },
    });
    console.log(`\n[${termo}] ${demands.length} encontrada(s):`);
    for (const d of demands) {
      const ps = d.plannedStartDate?.toISOString().slice(0, 10) ?? "—";
      const pd = d.plannedDeliveryDate?.toISOString().slice(0, 10) ?? "—";
      const as_ = d.actualStartDate?.toISOString().slice(0, 10) ?? "—";
      const ad  = d.actualDeliveryDate?.toISOString().slice(0, 10) ?? "—";
      console.log(`  [${d.id.slice(-6).toUpperCase()}] ${d.status}`);
      console.log(`    planned: ${ps} → ${pd}`);
      console.log(`    actual:  ${as_} → ${ad}`);
      console.log(`    título:  ${d.title}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
