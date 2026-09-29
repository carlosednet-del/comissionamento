import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Outubro calendário: 01/10 → 31/10
const OCT_START = new Date(2026, 9,  1, 0,  0,  0,   0);
const OCT_END   = new Date(2026, 10, 0, 23, 59, 59, 999);
// Setembro calendário: 01/09 → 30/09
const SEP_START = new Date(2026, 8,  1, 0,  0,  0,   0);
const SEP_END   = new Date(2026, 9,  0, 23, 59, 59, 999);

async function main() {
  const daniela = await prisma.user.findFirst({
    where: { name: { contains: "Daniela", mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (!daniela) { console.log("Daniela não encontrada"); return; }

  // Quais demands aparecem no dashboard de OUTUBRO por approvedAt?
  const approvedOct = await prisma.demand.findMany({
    where: { assigneeId: daniela.id, approvedAt: { gte: OCT_START, lte: OCT_END } },
    select: { id: true, title: true, approvedAt: true, homologationDate: true, status: true },
  });
  console.log(`\n[approvedAt em OUTUBRO] ${approvedOct.length} demandas:`);
  for (const d of approvedOct) {
    const ap = d.approvedAt?.toISOString().slice(0,10) ?? "—";
    const hm = d.homologationDate?.toISOString().slice(0,10) ?? "—";
    console.log(`  [${d.id.slice(-6).toUpperCase()}] approved:${ap} | homolog:${hm} | ${d.status} | ${d.title.slice(0,50)}`);
  }

  // Quais demands aparecem no dashboard de OUTUBRO por homologationDate?
  const homologOct = await prisma.demand.findMany({
    where: { assigneeId: daniela.id, homologationDate: { gte: OCT_START, lte: OCT_END } },
    select: { id: true, title: true, approvedAt: true, homologationDate: true },
  });
  console.log(`\n[homologationDate em OUTUBRO] ${homologOct.length} demandas:`);
  for (const d of homologOct) {
    const ap = d.approvedAt?.toISOString().slice(0,10) ?? "—";
    const hm = d.homologationDate?.toISOString().slice(0,10) ?? "—";
    console.log(`  [${d.id.slice(-6).toUpperCase()}] approved:${ap} | homolog:${hm} | ${d.title.slice(0,50)}`);
  }

  // Quais aparecem em SETEMBRO por homologationDate?
  const homologSep = await prisma.demand.findMany({
    where: { assigneeId: daniela.id, homologationDate: { gte: SEP_START, lte: SEP_END } },
    select: { id: true, title: true, homologationDate: true },
  });
  console.log(`\n[homologationDate em SETEMBRO calendário] ${homologSep.length} demandas`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
