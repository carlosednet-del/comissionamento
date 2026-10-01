import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Alinha plannedDeliveryDate com actualDeliveryDate (15/09) para
// que actual <= planned e o deflator não seja aplicado.
const SEP15 = new Date("2026-09-15T12:00:00.000Z");

async function main() {
  const willian = await prisma.user.findFirst({
    where: { name: { contains: "Willian", mode: "insensitive" }, role: "DEV" },
    select: { id: true, name: true },
  });
  if (!willian) { console.log("Willian não encontrado"); return; }
  console.log(`Usuário: ${willian.name}\n`);

  // Demandas com actualDeliveryDate = 15/09 mas plannedDeliveryDate anterior (geram deflação)
  const demands = await prisma.demand.findMany({
    where: {
      assigneeId: willian.id,
      actualDeliveryDate: SEP15,
      plannedDeliveryDate: { lt: SEP15 },
    },
    select: { id: true, title: true, plannedDeliveryDate: true, estimatedDemandValue: true },
  });

  console.log(`${demands.length} demanda(s) com deflação a corrigir:\n`);

  for (const d of demands) {
    const pd = d.plannedDeliveryDate?.toISOString().slice(0, 10) ?? "—";
    console.log(`  [${d.id.slice(-6).toUpperCase()}] planned:${pd} → 15/09 | R$${(d.estimatedDemandValue ?? 0).toFixed(2)}`);
    console.log(`    ${d.title.slice(0, 70)}`);
    await prisma.demand.update({
      where: { id: d.id },
      data: { plannedDeliveryDate: SEP15 },
    });
    console.log(`    ✓ plannedDeliveryDate atualizado para 15/09\n`);
  }

  console.log("Concluído ✓");
}

main().catch(console.error).finally(() => prisma.$disconnect());
