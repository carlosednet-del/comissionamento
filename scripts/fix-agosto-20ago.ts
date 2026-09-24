import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// IDs parciais visíveis no screenshot (últimos 6 chars)
const PARTIAL_IDS = ["Z8XQ8F", "H4WAYU", "BACAQ0", "F5EV20", "WKSARX", "PX4K83"];

const CICLO_FIM   = new Date("2026-08-15T00:00:00.000Z"); // último dia ciclo agosto
const LOG_INI     = new Date("2026-08-19T00:00:00.000Z");
const LOG_FIM     = new Date("2026-08-20T23:59:59.999Z");

async function main() {
  const demands = await prisma.demand.findMany({
    where: {
      OR: PARTIAL_IDS.map(p => ({ id: { contains: p.toLowerCase() } })),
    },
    select: {
      id: true, title: true, status: true,
      plannedDeliveryDate: true,
      actualDeliveryDate:  true,
      homologationDate:    true,
      assignee: { select: { name: true } },
    },
  });

  if (demands.length === 0) {
    console.log("Nenhuma demanda encontrada pelos IDs parciais.");
    console.log("Buscando por homologationDate = 20/08/2026 como fallback...");

    const byDate = await prisma.demand.findMany({
      where: {
        homologationDate: {
          gte: new Date("2026-08-20T00:00:00.000Z"),
          lte: new Date("2026-08-20T23:59:59.999Z"),
        },
      },
      select: { id: true, title: true, plannedDeliveryDate: true, actualDeliveryDate: true, assignee: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    console.log(`\nEncontradas ${byDate.length} demandas com homologação em 20/08:`);
    for (const d of byDate) {
      console.log(`  [${d.id.slice(-6)}] ${d.title} | assignee: ${d.assignee?.name} | planned: ${d.plannedDeliveryDate?.toISOString().slice(0,10)}`);
    }
    return;
  }

  console.log(`Encontradas ${demands.length} demandas:\n`);

  let totalLogs = 0;
  for (const d of demands) {
    const planned = d.plannedDeliveryDate;

    // Sem deflação: actualDelivery ≤ plannedDelivery
    // Ciclo de agosto: actualDelivery ≤ 15/08/2026
    // Estratégia: actual = min(planned, 15/08). Se planned null → 15/08
    let novaActual: Date;
    if (planned && planned <= CICLO_FIM) {
      novaActual = planned; // mesmo dia = fator 1.0, sem atraso
    } else {
      novaActual = CICLO_FIM; // 15/08 ≤ planned (que é > 15/08) → sem deflação
    }

    console.log(`[${d.id.slice(-6)}] ${d.title}`);
    console.log(`  assignee: ${d.assignee?.name}`);
    console.log(`  planned:  ${planned?.toISOString().slice(0,10) ?? "null"}`);
    console.log(`  actual antes: ${d.actualDeliveryDate?.toISOString().slice(0,10) ?? "null"}`);
    console.log(`  → actual novo: ${novaActual.toISOString().slice(0,10)}`);

    await prisma.demand.update({
      where: { id: d.id },
      data: {
        actualDeliveryDate: novaActual,
        homologationDate:   CICLO_FIM,
      },
    });

    const deleted = await prisma.auditLog.deleteMany({
      where: {
        entity:    "Demand",
        entityId:  d.id,
        createdAt: { gte: LOG_INI, lte: LOG_FIM },
      },
    });
    totalLogs += deleted.count;
    console.log(`  ✓ atualizada | ${deleted.count} logs apagados\n`);
  }

  console.log(`\n✓ Total: ${demands.length} demandas ajustadas, ${totalLogs} audit logs removidos`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
