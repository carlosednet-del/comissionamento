import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const demands = await prisma.demand.findMany({
    where: { title: { contains: "Planejamento Estratégico", mode: "insensitive" } },
    select: {
      id: true, title: true, status: true, isPedra: true,
      plannedStartDate: true, plannedDeliveryDate: true,
      assignee: { select: { name: true } },
    },
    orderBy: { plannedStartDate: "asc" },
  });

  console.log(`\nTotal: ${demands.length} demandas\n`);
  for (const d of demands) {
    const start = d.plannedStartDate ? d.plannedStartDate.toISOString().slice(0,10) : "sem data";
    const end   = d.plannedDeliveryDate ? d.plannedDeliveryDate.toISOString().slice(0,10) : "sem data";
    const pedra = d.isPedra ? "🪨 PEDRA" : "";
    const assignee = d.assignee?.name ?? "sem responsável";
    const id = d.id.slice(-6).toUpperCase();
    console.log(`[${id}] ${d.title.slice(0,55).padEnd(55)} | ${d.status.padEnd(20)} | ${start} → ${end} | ${assignee.padEnd(20)} ${pedra}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
