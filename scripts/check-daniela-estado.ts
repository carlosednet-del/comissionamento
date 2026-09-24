import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const daniela = await prisma.user.findFirst({
    where: { name: { contains: "Daniela", mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (!daniela) { console.log("Daniela não encontrada"); return; }
  console.log(`Usuário: ${daniela.name} [${daniela.id}]`);

  const demands = await prisma.demand.findMany({
    where: { assigneeId: daniela.id },
    select: {
      id: true, title: true, status: true,
      homologationDate: true,
      plannedDeliveryDate: true,
      actualDeliveryDate: true,
    },
    orderBy: { homologationDate: "asc" },
  });

  console.log(`\n${demands.length} demandas encontradas:\n`);
  for (const d of demands) {
    const h = d.homologationDate?.toISOString().slice(0, 10) ?? "—";
    const p = d.plannedDeliveryDate?.toISOString().slice(0, 10) ?? "—";
    const a = d.actualDeliveryDate?.toISOString().slice(0, 10) ?? "—";
    const deflated = d.actualDeliveryDate && d.plannedDeliveryDate &&
      new Date(d.actualDeliveryDate) > new Date(d.plannedDeliveryDate) ? " ⚠DEFLAC" : "";
    console.log(`  [${d.id.slice(-6).toUpperCase()}] homolog:${h} | planned:${p} | actual:${a}${deflated}`);
    console.log(`         ${d.title.slice(0, 70)}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
