import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const luciano = await prisma.user.findFirst({
    where: { name: { contains: "Luciano", mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (!luciano) { console.log("Luciano não encontrado"); return; }
  console.log(`${luciano.name} (${luciano.id})\n`);

  const pedras = await prisma.demand.findMany({
    where: { assigneeId: luciano.id, isPedra: true },
    select: {
      id: true, title: true, status: true,
      estimatedDemandValue: true, estimatedHours: true,
      plannedStartDate: true, plannedDeliveryDate: true,
    },
    orderBy: { plannedStartDate: "asc" },
  });

  console.log(`Pedras do ${luciano.name}:`);
  for (const d of pedras) {
    const s = d.plannedStartDate?.toISOString().slice(0,10) ?? "sem data";
    const e = d.plannedDeliveryDate?.toISOString().slice(0,10) ?? "sem data";
    console.log(`  [${d.id.slice(-6).toUpperCase()}] ${d.title.slice(0,60)}`);
    console.log(`         ${d.status} | ${s} → ${e} | R$${d.estimatedDemandValue ?? 0} | ${d.estimatedHours}h`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
