import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { name: { contains: "Hildo", mode: "insensitive" } },
    select: { id: true, name: true },
  });

  if (!user) { console.log("Usuário não encontrado"); return; }
  console.log("Usuário:", user.name, user.id);

  const demands = await prisma.demand.findMany({
    where: { assigneeId: user.id },
    select: {
      id: true,
      title: true,
      status: true,
      plannedStartDate: true,
      plannedDeliveryDate: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`\nTotal: ${demands.length} demandas\n`);
  for (const d of demands) {
    console.log(`ID:      ${d.id}`);
    console.log(`Título:  ${d.title}`);
    console.log(`Status:  ${d.status}`);
    console.log(`Start:   ${d.plannedStartDate?.toISOString().slice(0,10) ?? "—"}`);
    console.log(`Entrega: ${d.plannedDeliveryDate?.toISOString().slice(0,10) ?? "—"}`);
    console.log("");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
