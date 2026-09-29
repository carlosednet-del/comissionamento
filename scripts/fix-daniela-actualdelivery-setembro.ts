import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Último dia do ciclo 16/08→15/09 (meio-dia UTC para evitar fuso)
const ACTUAL_SET = new Date("2026-09-15T12:00:00.000Z");

async function main() {
  const daniela = await prisma.user.findFirst({
    where: { name: { contains: "Daniela", mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (!daniela) { console.log("Daniela não encontrada"); return; }
  console.log(`Usuário: ${daniela.name}`);

  // Todas as demandas com homologationDate em setembro (já corrigido)
  // que ainda têm actualDeliveryDate > 15/09/2026
  const SEP_CUTOFF = new Date("2026-09-15T23:59:59.999Z");
  const demands = await prisma.demand.findMany({
    where: {
      assigneeId: daniela.id,
      homologationDate: { not: null },
      actualDeliveryDate: { gt: SEP_CUTOFF },
    },
    select: {
      id: true, title: true,
      plannedDeliveryDate: true, actualDeliveryDate: true, homologationDate: true,
    },
  });

  console.log(`\n${demands.length} demandas com actualDeliveryDate > 15/09:\n`);

  for (const d of demands) {
    const p  = d.plannedDeliveryDate?.toISOString().slice(0, 10) ?? "—";
    const a  = d.actualDeliveryDate?.toISOString().slice(0, 10) ?? "—";
    const hm = d.homologationDate?.toISOString().slice(0, 10) ?? "—";
    console.log(`  [${d.id.slice(-6).toUpperCase()}] planned:${p} | actual:${a} | homolog:${hm}`);
    console.log(`         ${d.title.slice(0, 60)}`);

    await prisma.demand.update({
      where: { id: d.id },
      data: { actualDeliveryDate: ACTUAL_SET },
    });
    console.log(`         ✓ actualDeliveryDate → 2026-09-15`);
  }

  console.log("\nConcluído ✓");
}

main().catch(console.error).finally(() => prisma.$disconnect());
