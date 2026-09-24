import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const demands = await prisma.demand.findMany({
    where: { title: { contains: "Chaves", mode: "insensitive" } },
    select: {
      id: true, title: true, status: true, assigneeId: true,
      plannedStartDate: true, plannedDeliveryDate: true, actualDeliveryDate: true,
      assignee: { select: { name: true } },
    },
  });

  console.log(`${demands.length} demandas encontradas com "Chaves":\n`);
  for (const d of demands) {
    const p = d.plannedDeliveryDate?.toISOString().slice(0,10) ?? "—";
    const a = d.actualDeliveryDate?.toISOString().slice(0,10) ?? "—";
    const late = d.actualDeliveryDate && d.plannedDeliveryDate &&
      new Date(d.actualDeliveryDate) > new Date(d.plannedDeliveryDate);
    console.log(`  [${d.id.slice(-6).toUpperCase()}] ${d.assignee?.name ?? "?"} | ${d.status}`);
    console.log(`         planned:${p} | actual:${a} ${late ? "⚠ DEFLACIONADA" : "✓ ok"}`);
    console.log(`         ${d.title.slice(0, 70)}`);
  }

  const deflated = demands.filter(d =>
    d.actualDeliveryDate && d.plannedDeliveryDate &&
    new Date(d.actualDeliveryDate) > new Date(d.plannedDeliveryDate)
  );

  if (deflated.length === 0) { console.log("\nNenhuma deflação encontrada."); return; }

  console.log(`\nCorrigindo ${deflated.length} demanda(s)...\n`);
  for (const d of deflated) {
    await prisma.demand.update({
      where: { id: d.id },
      data: { actualDeliveryDate: d.plannedDeliveryDate },
    });
    console.log(`  ✓ [${d.id.slice(-6).toUpperCase()}] actual → ${d.plannedDeliveryDate?.toISOString().slice(0,10)}`);
  }
  console.log("\nConcluído ✓");
}

main().catch(console.error).finally(() => prisma.$disconnect());
