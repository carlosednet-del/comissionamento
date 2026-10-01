import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Último dia do ciclo setembro: 15/09 meio-dia UTC
const SEP15 = new Date("2026-09-15T12:00:00.000Z");

const IDS_SUFIXO = ["PDYSCK", "VF3PPZ"];

async function main() {
  const william = await prisma.user.findFirst({
    where: { name: { contains: "William", mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (!william) { console.log("William não encontrado"); return; }
  console.log(`Usuário: ${william.name}\n`);

  const demands = await prisma.demand.findMany({
    where: {
      assigneeId: william.id,
      OR: IDS_SUFIXO.map((s) => ({ id: { endsWith: s.toLowerCase() } })),
    },
    select: {
      id: true, title: true, status: true,
      plannedDeliveryDate: true, actualDeliveryDate: true, homologationDate: true,
      estimatedDemandValue: true,
    },
  });

  console.log(`${demands.length} demanda(s) encontradas:\n`);
  for (const d of demands) {
    const pd = d.plannedDeliveryDate?.toISOString().slice(0, 10) ?? "—";
    const ad = d.actualDeliveryDate?.toISOString().slice(0, 10) ?? "—";
    const hm = d.homologationDate?.toISOString().slice(0, 10) ?? "—";
    const val = (d.estimatedDemandValue ?? 0).toFixed(2);
    console.log(`  [${d.id.slice(-6).toUpperCase()}] ${d.status} | planned:${pd} | actual:${ad} | homolog:${hm} | R$${val}`);
    console.log(`    ${d.title}`);

    await prisma.demand.update({
      where: { id: d.id },
      data: {
        status:           "HOMOLOGADA_PRODUCAO",
        homologationDate: SEP15,
        actualDeliveryDate: SEP15,
      },
    });
    console.log(`    ✓ status → HOMOLOGADA_PRODUCAO | homologationDate → 2026-09-15 | actualDeliveryDate → 2026-09-15\n`);
  }

  console.log("Concluído ✓");
}

main().catch(console.error).finally(() => prisma.$disconnect());
