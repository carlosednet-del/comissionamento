import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

function utc(y: number, m: number, d: number) {
  return new Date(`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}T00:00:00.000Z`);
}

// Os 11 itens empilhados em 21/08-22/08 → redistribuir de 27/07 a 28/08
// Mapeamento: suffix → [start, end]
const SCHEDULE: Record<string, [Date, Date]> = {
  "AM2PTH": [utc(2026,7,27), utc(2026,7,29)],  // [16] Operação do SDR
  "C3VIVO": [utc(2026,7,30), utc(2026,8,1)],   // [07] Estoque ativo
  "GGBURD": [utc(2026,8,2),  utc(2026,8,4)],   // [09] Controles
  "F08WX2": [utc(2026,8,5),  utc(2026,8,7)],   // [15] Quebrar a meta
  "3PXUHR": [utc(2026,8,8),  utc(2026,8,10)],  // [13] Histórico
  "XFEOZG": [utc(2026,8,11), utc(2026,8,13)],  // [18] Abrir o Ritmo
  "5YKVSR": [utc(2026,8,14), utc(2026,8,16)],  // [02] Terceira linha
  "TDPUTV": [utc(2026,8,17), utc(2026,8,19)],  // Desenho e Acompanhamento
  "JVMXUK": [utc(2026,8,20), utc(2026,8,22)],  // [03] Regime
  "OVEJPE": [utc(2026,8,23), utc(2026,8,25)],  // Criar telas de funil
  "D1Z1ZR": [utc(2026,8,26), utc(2026,8,28)],  // [33] Imobiliárias
};

async function main() {
  const luiz = await prisma.user.findFirst({
    where: { name: { contains: "Luiz", mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (!luiz) { console.log("Luiz não encontrado"); return; }

  const demands = await prisma.demand.findMany({
    where: {
      assigneeId: luiz.id,
      isPedra: true,
      title: { contains: "Planejamento Estratégico", mode: "insensitive" },
      status: "HOMOLOGADA_PRODUCAO",
    },
    select: { id: true, title: true, plannedStartDate: true, plannedDeliveryDate: true },
  });

  console.log(`\nEncontradas ${demands.length} pedras HOMOLOGADA_PRODUCAO do ${luiz.name}\n`);

  let updated = 0;
  for (const d of demands) {
    const suffix = d.id.slice(-6).toUpperCase();
    const sched = SCHEDULE[suffix];
    if (!sched) {
      const s = d.plannedStartDate?.toISOString().slice(0,10) ?? "sem data";
      const e = d.plannedDeliveryDate?.toISOString().slice(0,10) ?? "sem data";
      console.log(`  ⏭ [${suffix}] mantido  ${s} → ${e}  ${d.title.slice(0,50)}`);
      continue;
    }
    await prisma.demand.update({
      where: { id: d.id },
      data: { plannedStartDate: sched[0], plannedDeliveryDate: sched[1] },
    });
    console.log(`  ✓ [${suffix}] ${sched[0].toISOString().slice(0,10)} → ${sched[1].toISOString().slice(0,10)}  ${d.title.slice(0,50)}`);
    updated++;
  }

  // Confirmar as 2 novas (Levantamento de Escopo) — já estão em 23/09-02/10
  console.log("\n--- Confirmando as 2 novas (Levantamento de Escopo) ---");
  const novas = await prisma.demand.findMany({
    where: {
      assigneeId: luiz.id,
      title: { contains: "Levantamento de Escopo", mode: "insensitive" },
    },
    select: { id: true, title: true, plannedStartDate: true, plannedDeliveryDate: true },
  });
  for (const d of novas) {
    const s = d.plannedStartDate?.toISOString().slice(0,10) ?? "sem data";
    const e = d.plannedDeliveryDate?.toISOString().slice(0,10) ?? "sem data";
    console.log(`  ✓ [${d.id.slice(-6).toUpperCase()}] ${s} → ${e}  ${d.title.slice(0,55)}`);
  }

  console.log(`\n${updated} demandas redistribuídas ✓`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
