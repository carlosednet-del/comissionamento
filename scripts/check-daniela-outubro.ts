import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Ciclo outubro: 16/09 → 15/10 (servidor UTC-3 → UTC offsets)
const OCT_START = new Date("2026-09-16T03:00:00.000Z");
const OCT_END   = new Date("2026-10-16T02:59:59.999Z");

async function main() {
  const daniela = await prisma.user.findFirst({
    where: { name: { contains: "Daniela", mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (!daniela) { console.log("Daniela não encontrada"); return; }

  const demands = await prisma.demand.findMany({
    where: { assigneeId: daniela.id, homologationDate: { gte: OCT_START, lte: OCT_END } },
    select: { id: true, title: true, homologationDate: true, plannedDeliveryDate: true, actualDeliveryDate: true },
    orderBy: { homologationDate: "asc" },
  });

  console.log(`${demands.length} demandas da Daniela no ciclo de outubro (homolog 16/09→15/10):\n`);
  for (const d of demands) {
    const h = d.homologationDate?.toISOString().slice(0, 10) ?? "—";
    const p = d.plannedDeliveryDate?.toISOString().slice(0, 10) ?? "—";
    const a = d.actualDeliveryDate?.toISOString().slice(0, 10) ?? "—";
    const def = d.actualDeliveryDate && d.plannedDeliveryDate &&
      new Date(d.actualDeliveryDate) > new Date(d.plannedDeliveryDate) ? " ⚠DEFLAC" : "";
    console.log(`  [${d.id.slice(-6).toUpperCase()}] homolog:${h} | planned:${p} | actual:${a}${def}`);
    console.log(`         ${d.title.slice(0, 70)}`);
  }

  // Também checar com UTC puro (caso servidor rode em UTC)
  const OCT_START_UTC = new Date("2026-09-16T00:00:00.000Z");
  const OCT_END_UTC   = new Date("2026-10-15T23:59:59.999Z");
  const demands2 = await prisma.demand.findMany({
    where: { assigneeId: daniela.id, homologationDate: { gte: OCT_START_UTC, lte: OCT_END_UTC } },
    select: { id: true },
  });
  console.log(`\n(Se servidor UTC) ${demands2.length} demandas no ciclo de outubro.`);
  console.log("IDs:", demands2.map(d => d.id.slice(-6).toUpperCase()).join(", "));
}

main().catch(console.error).finally(() => prisma.$disconnect());
