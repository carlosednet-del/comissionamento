import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const luiz = await prisma.user.findFirst({
    where: { name: { contains: "Luiz", mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (!luiz) { console.log("Luiz não encontrado"); return; }
  console.log(`Usuário: ${luiz.name} [${luiz.id}]`);

  const demands = await prisma.demand.findMany({
    where: {
      assigneeId: luiz.id,
      status: "CANCELADA",
      title: { contains: "Planejamento", mode: "insensitive" },
    },
    select: { id: true, title: true, plannedStartDate: true, plannedDeliveryDate: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`\n${demands.length} demandas canceladas de Planejamento encontradas:`);
  for (const d of demands) {
    console.log(`  [${d.id.slice(-6).toUpperCase()}] ${d.title.slice(0, 70)}`);
    console.log(`         ${d.plannedStartDate?.toISOString().slice(0,10)} → ${d.plannedDeliveryDate?.toISOString().slice(0,10)}`);
  }

  if (demands.length === 0) { return; }

  for (const d of demands) {
    await prisma.demand.delete({ where: { id: d.id } });
    console.log(`  ✓ Apagada [${d.id.slice(-6).toUpperCase()}]`);
  }
  console.log("\nConcluído ✓");
}

main().catch(console.error).finally(() => prisma.$disconnect());
