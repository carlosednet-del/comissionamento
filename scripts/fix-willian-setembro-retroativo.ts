import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Limite do ciclo setembro (16/08→15/09)
const SEP15      = new Date("2026-09-15T12:00:00.000Z");
const SEP16_START = new Date("2026-09-16T00:00:00.000Z");
const SEP30_END   = new Date("2026-09-30T23:59:59.999Z");

async function main() {
  const willian = await prisma.user.findFirst({
    where: { name: { contains: "Willian", mode: "insensitive" }, role: "DEV" },
    select: { id: true, name: true },
  });
  if (!willian) { console.log("Willian não encontrado"); return; }
  console.log(`Usuário: ${willian.name}\n`);

  // Demandas HOMOLOGADA_PRODUCAO com actualDeliveryDate em 16/09–30/09
  const homologadas = await prisma.demand.findMany({
    where: {
      assigneeId: willian.id,
      status: "HOMOLOGADA_PRODUCAO",
      actualDeliveryDate: { gte: SEP16_START, lte: SEP30_END },
    },
    select: {
      id: true, title: true, status: true,
      plannedDeliveryDate: true, actualDeliveryDate: true, homologationDate: true,
      estimatedDemandValue: true,
    },
  });

  // Demandas AGUARDANDO_HOMOLOGACAO com actualDeliveryDate em 16/09–30/09
  const aguardando = await prisma.demand.findMany({
    where: {
      assigneeId: willian.id,
      status: "AGUARDANDO_HOMOLOGACAO",
      actualDeliveryDate: { gte: SEP16_START, lte: SEP30_END },
    },
    select: {
      id: true, title: true, status: true,
      plannedDeliveryDate: true, actualDeliveryDate: true, homologationDate: true,
      estimatedDemandValue: true,
    },
  });

  const todas = [...homologadas, ...aguardando];
  console.log(`${todas.length} demanda(s) para mover ao ciclo de setembro:\n`);

  for (const d of todas) {
    const pd  = d.plannedDeliveryDate?.toISOString().slice(0, 10) ?? "—";
    const ad  = d.actualDeliveryDate?.toISOString().slice(0, 10) ?? "—";
    const hm  = d.homologationDate?.toISOString().slice(0, 10) ?? "—";
    const val = (d.estimatedDemandValue ?? 0).toFixed(2);
    const isLate = d.plannedDeliveryDate && SEP15 > d.plannedDeliveryDate;
    const deflTag = isLate ? "⚠ deflator aplicável" : "sem deflator";

    console.log(`  [${d.id.slice(-6).toUpperCase()}] ${d.status}`);
    console.log(`    planned:${pd} | actual:${ad} | homolog:${hm} | R$${val} | ${deflTag}`);
    console.log(`    ${d.title.slice(0, 70)}`);

    const updateData: any = {
      actualDeliveryDate: SEP15,
      homologationDate:   SEP15,
    };
    if (d.status === "AGUARDANDO_HOMOLOGACAO") {
      updateData.status = "HOMOLOGADA_PRODUCAO";
    }

    await prisma.demand.update({ where: { id: d.id }, data: updateData });
    console.log(`    ✓ atualizado → actualDeliveryDate:15/09 | homologationDate:15/09${d.status === "AGUARDANDO_HOMOLOGACAO" ? " | status:HOMOLOGADA_PRODUCAO" : ""}\n`);
  }

  console.log("Concluído ✓");
}

main().catch(console.error).finally(() => prisma.$disconnect());
