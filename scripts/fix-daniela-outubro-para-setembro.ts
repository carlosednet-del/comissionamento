import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const IDS_SUFIXO = [
  "GKI4AR","5CZZ34","6RA3QX","GHUMCP","RMNJQ8",
  "J1SGVM","Y3GDU7","UV00R3","197R1L","4DHK86",
  "L2D0QZ","IY851Y","F5KVC2",
  // variantes reais (ambiguidade O/0, B/8, S/5)
  "UVOOR3","4DHKB6","FSKVC2",
];

const SET_DATE = new Date("2026-09-24T12:00:00.000Z");

async function main() {
  const daniela = await prisma.user.findFirst({
    where: { name: { contains: "Daniela", mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (!daniela) { console.log("Daniela não encontrada"); return; }
  console.log(`Usuário: ${daniela.name}`);

  const all = await prisma.demand.findMany({
    where: { assigneeId: daniela.id },
    select: {
      id: true, title: true,
      homologationDate: true, actualDeliveryDate: true, plannedDeliveryDate: true,
    },
  });

  const targets = all.filter(d => IDS_SUFIXO.includes(d.id.slice(-6).toUpperCase()));

  console.log(`\n${targets.length} demandas encontradas:\n`);
  for (const d of targets) {
    const h = d.homologationDate?.toISOString().slice(0,10) ?? "—";
    const a = d.actualDeliveryDate?.toISOString().slice(0,10) ?? "—";
    const p = d.plannedDeliveryDate?.toISOString().slice(0,10) ?? "—";
    console.log(`  [${d.id.slice(-6).toUpperCase()}] homolog:${h} | actual:${a} | planned:${p}`);
    console.log(`         ${d.title.slice(0,60)}`);
  }

  if (targets.length === 0) { return; }

  console.log(`\nAtualizando homologationDate → 2026-09-24 e actualDeliveryDate → plannedDeliveryDate...\n`);
  for (const d of targets) {
    await prisma.demand.update({
      where: { id: d.id },
      data: {
        homologationDate:  SET_DATE,
        actualDeliveryDate: d.plannedDeliveryDate, // garante sem deflação
      },
    });
    console.log(`  ✓ [${d.id.slice(-6).toUpperCase()}] ${d.title.slice(0,55)}`);
  }
  console.log("\nConcluído ✓");
}

main().catch(console.error).finally(() => prisma.$disconnect());
