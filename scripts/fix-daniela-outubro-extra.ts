import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const HOMOLOG_SET = new Date("2026-09-15T12:00:00.000Z");
const IDS_SUFIXO = ["ML3O5B", "V2Z1MJ"];

async function main() {
  const daniela = await prisma.user.findFirst({
    where: { name: { contains: "Daniela", mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (!daniela) { console.log("Daniela não encontrada"); return; }
  console.log(`Usuário: ${daniela.name}`);

  const all = await prisma.demand.findMany({
    where: { assigneeId: daniela.id },
    select: { id: true, title: true, homologationDate: true, plannedDeliveryDate: true, actualDeliveryDate: true },
  });

  const targets = all.filter(d => IDS_SUFIXO.includes(d.id.slice(-6).toUpperCase()));
  console.log(`\n${targets.length} demandas encontradas:\n`);

  for (const d of targets) {
    console.log(`  [${d.id.slice(-6).toUpperCase()}] ${d.title.slice(0, 60)}`);
    console.log(`    homolog: ${d.homologationDate?.toISOString().slice(0,10)} → 2026-09-15`);
    await prisma.demand.update({
      where: { id: d.id },
      data: { homologationDate: HOMOLOG_SET },
    });
    console.log(`    ✓ atualizado`);
  }
  console.log("\nConcluído ✓");
}

main().catch(console.error).finally(() => prisma.$disconnect());
