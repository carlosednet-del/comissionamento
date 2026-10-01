import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Ciclo setembro 16-15: 16/08 → 15/09/2026
const SEP_GTE = new Date("2026-08-16T00:00:00.000Z");
const SEP_LTE = new Date("2026-09-15T23:59:59.999Z");

async function main() {
  const user = await prisma.user.findFirst({
    where: { name: { contains: "Willian", mode: "insensitive" }, role: "DEV" },
    select: { id: true, name: true },
  });
  if (!user) { console.log("Não encontrado"); return; }
  console.log(`${user.name} (${user.id})\n`);

  const demands = await prisma.demand.findMany({
    where: { assigneeId: user.id },
    select: {
      id: true, title: true, status: true,
      homologationDate: true, actualDeliveryDate: true, plannedDeliveryDate: true,
      estimatedDemandValue: true,
    },
    orderBy: { actualDeliveryDate: "asc" },
  });

  console.log(`Total: ${demands.length} demandas\n`);

  const fora = [];
  for (const d of demands) {
    const hm = d.homologationDate?.toISOString().slice(0, 10) ?? "—";
    const ad = d.actualDeliveryDate?.toISOString().slice(0, 10) ?? "—";
    const pd = d.plannedDeliveryDate?.toISOString().slice(0, 10) ?? "—";
    const val = (d.estimatedDemandValue ?? 0).toFixed(2);
    const inCycle = d.actualDeliveryDate
      ? d.actualDeliveryDate >= SEP_GTE && d.actualDeliveryDate <= SEP_LTE
      : false;
    const label = inCycle ? "DENTRO" : "FORA";
    console.log(`  [${d.id.slice(-6).toUpperCase()}] ${label} | ${d.status.padEnd(25)} | hm:${hm} | ad:${ad} | pd:${pd} | R$${val}`);
    console.log(`    ${d.title.slice(0, 70)}`);
    if (!inCycle) fora.push(d);
  }

  console.log(`\nFora do ciclo: ${fora.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
