import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const SEP_START = new Date("2026-09-01T00:00:00.000Z");
const SEP_END   = new Date("2026-09-30T23:59:59.999Z");

async function main() {
  const roberth = await prisma.user.findFirst({
    where: { name: { contains: "Roberth", mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (!roberth) { console.log("Roberth não encontrado"); return; }
  console.log(`Usuário: ${roberth.name} [${roberth.id}]`);

  const demands = await prisma.demand.findMany({
    where: {
      assigneeId: roberth.id,
      OR: [
        { plannedDeliveryDate: { gte: SEP_START, lte: SEP_END } },
        { actualDeliveryDate:  { gte: SEP_START, lte: SEP_END } },
      ],
    },
    select: {
      id: true, title: true, status: true,
      plannedDeliveryDate: true, actualDeliveryDate: true,
    },
    orderBy: { plannedDeliveryDate: "asc" },
  });

  const deflated = demands.filter(d =>
    d.actualDeliveryDate && d.plannedDeliveryDate &&
    new Date(d.actualDeliveryDate) > new Date(d.plannedDeliveryDate)
  );

  console.log(`\n${demands.length} demandas em setembro | ${deflated.length} deflacionadas:\n`);
  for (const d of demands) {
    const p = d.plannedDeliveryDate?.toISOString().slice(0,10) ?? "—";
    const a = d.actualDeliveryDate?.toISOString().slice(0,10) ?? "—";
    const flag = deflated.find(x => x.id === d.id) ? "⚠ DEFLACIONADA" : "✓ ok";
    console.log(`  [${d.id.slice(-6).toUpperCase()}] planned:${p} | actual:${a} | ${flag}`);
    console.log(`         ${d.title.slice(0, 70)}`);
  }

  if (deflated.length === 0) { console.log("\nNenhuma deflação encontrada."); return; }

  console.log(`\nCorrigindo ${deflated.length} demandas (actualDeliveryDate → plannedDeliveryDate)...\n`);
  for (const d of deflated) {
    await prisma.demand.update({
      where: { id: d.id },
      data: { actualDeliveryDate: d.plannedDeliveryDate },
    });
    console.log(`  ✓ [${d.id.slice(-6).toUpperCase()}] actual corrigido para ${d.plannedDeliveryDate?.toISOString().slice(0,10)}`);
  }
  console.log("\nConcluído ✓");
}

main().catch(console.error).finally(() => prisma.$disconnect());
