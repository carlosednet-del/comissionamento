import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Ciclo de setembro: 16/08 → 15/09 (statementPeriod.ts)
// Último dia do ciclo = 15/09 ao meio-dia UTC (evita fuso UTC-3)
const HOMOLOG_SET = new Date("2026-09-15T12:00:00.000Z");

const IDS_SUFIXO = [
  "GKI4AR","5CZZ34","6RA3QX","GHUMCP","RMNJQ8",
  "J1SGVM","Y3GDU7","UVOOR3","197R1L","4DHKB6",
  "L2D0QZ","IY851Y","FSKVC2",
];

async function main() {
  const daniela = await prisma.user.findFirst({
    where: { name: { contains: "Daniela", mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (!daniela) { console.log("Daniela não encontrada"); return; }
  console.log(`Usuário: ${daniela.name}`);

  const all = await prisma.demand.findMany({
    where: { assigneeId: daniela.id },
    select: { id: true, title: true, homologationDate: true, plannedDeliveryDate: true },
  });

  const targets = all.filter(d => IDS_SUFIXO.includes(d.id.slice(-6).toUpperCase()));

  console.log(`\n${targets.length} demandas encontradas. Atualizando homologationDate → 15/09/2026...\n`);
  for (const d of targets) {
    await prisma.demand.update({
      where: { id: d.id },
      data: {
        homologationDate:   HOMOLOG_SET,
        actualDeliveryDate: d.plannedDeliveryDate, // sem deflação
      },
    });
    console.log(`  ✓ [${d.id.slice(-6).toUpperCase()}] ${d.title.slice(0, 60)}`);
  }
  console.log("\nConcluído ✓");
}

main().catch(console.error).finally(() => prisma.$disconnect());
