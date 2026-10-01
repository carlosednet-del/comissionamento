import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Ciclo setembro 16-15: 16/08 → 15/09/2026
const SEP_GTE = new Date("2026-08-16T00:00:00.000Z");
const SEP_LTE = new Date("2026-09-15T23:59:59.999Z");

async function main() {
  const william = await prisma.user.findFirst({
    where: { name: { contains: "William", mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (!william) { console.log("William não encontrado"); return; }
  console.log(`Usuário: ${william.name} (${william.id})\n`);

  // Demandas HOMOLOGADAS fora do ciclo de setembro
  const homologadas = await prisma.demand.findMany({
    where: {
      assigneeId: william.id,
      status: "HOMOLOGADA_PRODUCAO",
      OR: [
        { homologationDate: null },
        { homologationDate: { lt: SEP_GTE } },
        { homologationDate: { gt: SEP_LTE } },
      ],
    },
    select: {
      id: true, title: true,
      plannedDeliveryDate: true, actualDeliveryDate: true, homologationDate: true,
      estimatedDemandValue: true, status: true,
    },
    orderBy: { homologationDate: "asc" },
  });

  console.log(`Demandas HOMOLOGADAS fora do ciclo 16/08→15/09: ${homologadas.length}\n`);
  for (const d of homologadas) {
    const pd = d.plannedDeliveryDate?.toISOString().slice(0, 10) ?? "—";
    const ad = d.actualDeliveryDate?.toISOString().slice(0, 10) ?? "—";
    const hm = d.homologationDate?.toISOString().slice(0, 10) ?? "—";
    const val = d.estimatedDemandValue?.toFixed(2) ?? "—";
    console.log(`  [${d.id.slice(-6).toUpperCase()}] homolog:${hm} | actual:${ad} | planned:${pd} | R$${val}`);
    console.log(`    ${d.title.slice(0, 70)}`);
  }

  // Também mostrar as que JÁ estão dentro do ciclo (referência)
  const dentro = await prisma.demand.findMany({
    where: {
      assigneeId: william.id,
      status: "HOMOLOGADA_PRODUCAO",
      homologationDate: { gte: SEP_GTE, lte: SEP_LTE },
    },
    select: { id: true, title: true, homologationDate: true, actualDeliveryDate: true },
  });
  console.log(`\nDemandas já dentro do ciclo setembro: ${dentro.length}`);
  for (const d of dentro) {
    const hm = d.homologationDate?.toISOString().slice(0, 10) ?? "—";
    const ad = d.actualDeliveryDate?.toISOString().slice(0, 10) ?? "—";
    console.log(`  [${d.id.slice(-6).toUpperCase()}] homolog:${hm} | actual:${ad} | ${d.title.slice(0, 60)}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
