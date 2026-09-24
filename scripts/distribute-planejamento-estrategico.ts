import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// UTC midnight helper
function utc(y: number, m: number, d: number) {
  return new Date(`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}T00:00:00.000Z`);
}

// AGUARDANDO_HOMOLOGACAO: spread across 01/09 → 30/09
const aguardandoSchedule = [
  { suffix: "ON5QL3", start: utc(2026,9,1),  end: utc(2026,9,3)  }, // [27] Faixa de indicadores
  { suffix: "S81QHP", start: utc(2026,9,4),  end: utc(2026,9,6)  }, // [21] Visita e lead
  { suffix: "IDTZMG", start: utc(2026,9,7),  end: utc(2026,9,9)  }, // [06] Corte de 3 meses
  { suffix: "31ARSJ", start: utc(2026,9,10), end: utc(2026,9,12) }, // [24] Cards de meta
  { suffix: "S19XZ1", start: utc(2026,9,13), end: utc(2026,9,15) }, // [28] Taxa de cancelamento
  { suffix: "H4TUTJ", start: utc(2026,9,16), end: utc(2026,9,18) }, // [20] Registro de tentativa
  { suffix: "OZ2F51", start: utc(2026,9,19), end: utc(2026,9,21) }, // [12] Informação entre etapas
  { suffix: "1ZCQDQ", start: utc(2026,9,22), end: utc(2026,9,24) }, // [32] Visão de gerência
  { suffix: "OQB7W9", start: utc(2026,9,25), end: utc(2026,9,27) }, // [25] Cards abaixo do funil
  { suffix: "9MYOI8", start: utc(2026,9,28), end: utc(2026,9,30) }, // [14/23/26/30] Ajustes
];

// APROVADA (sem data): give them dates + remove isPedra
const aprovadaSchedule = [
  { suffix: "EGP9XK", start: utc(2026,9,24), end: utc(2026,9,26), removePedra: true  }, // [19] Finalizados
  { suffix: "YZPW32", start: utc(2026,9,25), end: utc(2026,9,27), removePedra: true  }, // Entrega de Lista
  { suffix: "G6EBG2", start: utc(2026,9,27), end: utc(2026,9,28), removePedra: true  }, // [08] Plano marketing
  { suffix: "IOHWOP", start: utc(2026,9,28), end: utc(2026,9,29), removePedra: true  }, // [04] DECISÃO
  { suffix: "0WA6U7", start: utc(2026,9,29), end: utc(2026,9,30), removePedra: false }, // Atalho Gestão
];

async function main() {
  const demands = await prisma.demand.findMany({
    where: { title: { contains: "Planejamento Estratégico", mode: "insensitive" } },
    select: { id: true, title: true, status: true },
  });

  const byId: Record<string, string> = {};
  for (const d of demands) {
    const suffix = d.id.slice(-6).toUpperCase();
    byId[suffix] = d.id;
  }

  console.log("\n--- AGUARDANDO_HOMOLOGACAO: distribuindo ---");
  for (const s of aguardandoSchedule) {
    const id = byId[s.suffix];
    if (!id) { console.log(`  ⚠ ${s.suffix} não encontrado`); continue; }
    await prisma.demand.update({
      where: { id },
      data: { plannedStartDate: s.start, plannedDeliveryDate: s.end },
    });
    console.log(`  ✓ [${s.suffix}] ${s.start.toISOString().slice(0,10)} → ${s.end.toISOString().slice(0,10)}`);
  }

  console.log("\n--- APROVADA: datas + remover isPedra ---");
  for (const s of aprovadaSchedule) {
    const id = byId[s.suffix];
    if (!id) { console.log(`  ⚠ ${s.suffix} não encontrado`); continue; }
    await prisma.demand.update({
      where: { id },
      data: {
        plannedStartDate: s.start,
        plannedDeliveryDate: s.end,
        ...(s.removePedra ? { isPedra: false } : {}),
      },
    });
    console.log(`  ✓ [${s.suffix}] ${s.start.toISOString().slice(0,10)} → ${s.end.toISOString().slice(0,10)}${s.removePedra ? " | isPedra → false" : ""}`);
  }

  console.log("\nConcluído ✓");
}

main().catch(console.error).finally(() => prisma.$disconnect());
