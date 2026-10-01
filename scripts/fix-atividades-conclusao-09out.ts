import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Sexta-feira 09/10/2026 ao meio-dia UTC (evita fuso UTC-3)
const SEXTA = new Date("2026-10-09T12:00:00.000Z");

// IDs das 3 demandas (sufixos finais para conferência)
// ELIMGM = Diagnóstico e Baseline da Infraestrutura de TI
// RRNJ33 = Blitz de Infraestrutura de TI nas Obras
// 28EZH2 = Adequação e Correções Críticas — Sede
const SUFIXOS = ["ELIMGM", "RRNJ33", "28EZH2"];

async function main() {
  const demands = await prisma.demand.findMany({
    where: {
      OR: SUFIXOS.map((s) => ({ id: { endsWith: s.toLowerCase() } })),
    },
    select: {
      id: true, title: true,
      plannedDeliveryDate: true,
    },
  });

  console.log(`${demands.length} demanda(s) encontradas:\n`);
  for (const d of demands) {
    const pd = d.plannedDeliveryDate?.toISOString().slice(0, 10) ?? "—";
    console.log(`  [${d.id.slice(-6).toUpperCase()}] planned atual: ${pd}`);
    console.log(`    ${d.title}`);

    await prisma.demand.update({
      where: { id: d.id },
      data: { plannedDeliveryDate: SEXTA },
    });
    console.log(`    ✓ plannedDeliveryDate → 2026-10-09`);
  }

  console.log("\nConcluído ✓");
}

main().catch(console.error).finally(() => prisma.$disconnect());
