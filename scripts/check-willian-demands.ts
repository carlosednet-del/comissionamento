import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const willian = await prisma.user.findFirst({
    where: { name: { contains: "Willian", mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (!willian) { console.log("Willian não encontrado"); return; }
  console.log(`\n${willian.name} (${willian.id})\n`);

  const demands = await prisma.demand.findMany({
    where: { assigneeId: willian.id },
    select: {
      id: true, title: true, status: true, isPedra: true,
      plannedStartDate: true, plannedDeliveryDate: true,
    },
    orderBy: { plannedStartDate: "asc" },
  });

  for (const d of demands) {
    const s = d.plannedStartDate?.toISOString().slice(0,10) ?? "sem data";
    const e = d.plannedDeliveryDate?.toISOString().slice(0,10) ?? "sem data";
    const p = d.isPedra ? "🪨" : "  ";
    console.log(`${p} [${d.id.slice(-6).toUpperCase()}] ${d.title.slice(0,60).padEnd(60)} | ${d.status.padEnd(22)} | ${s} → ${e}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
