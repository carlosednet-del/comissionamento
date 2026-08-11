import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Datas extraídas do PDF — Plano de Trabalho Infraestrutura TI Ago-Set/2026
const UPDATES = [
  {
    id: "cmsoqttbz00349s2wmcelimgm",
    title: "Diagnóstico e Baseline da Infraestrutura de TI",
    start:    "2026-08-11",
    delivery: "2026-08-31",
  },
  {
    id: "cmsoqww3m003a9s2wlt3upspj",
    title: "Inventário Físico e Conciliação de Ativos",
    start:    "2026-08-11",
    delivery: "2026-09-15",
  },
  {
    id: "cmsor2qfb003e9s2w3onxsm1k",
    title: "Política de Máquinas e Ativos de TI",
    start:    "2026-08-12",
    delivery: "2026-08-31",
  },
  {
    id: "cmsor64ai003i9s2wjjcsipqo",
    title: "Rotina Semanal de Atualizações de Segurança",
    start:    "2026-08-04",
    delivery: "2026-09-29",
  },
  {
    id: "cmsor9yu9003m9s2wl96sa627",
    title: "Padronização da Infraestrutura de TI",
    start:    "2026-08-17",
    delivery: "2026-09-11",
  },
  {
    id: "cmsos5gvi003q9s2wk6t5673k",
    title: "Estruturação do Estoque Técnico de TI",
    start:    "2026-08-17",
    delivery: "2026-09-18",
  },
  {
    id: "cmsosakbx003u9s2wjl28ezh2",
    title: "Adequação e Correções Críticas",
    start:    "2026-08-24",
    delivery: "2026-09-25",
  },
  {
    id: "cmsosjri2003y9s2wzsu6g2l7",
    title: "Monitoramento e Indicadores de Infraestrutura",
    start:    "2026-08-24",
    delivery: "2026-09-25",
  },
  {
    id: "cmsossjrr00429s2wkahgu13z",
    title: "Relatórios Executivos e Consolidação do Ciclo",
    start:    "2026-08-31",
    delivery: "2026-09-30",
  },
  {
    id: "cmsosvaq300469s2wbkrrnj33",
    title: "Blitz de Infraestrutura de TI nas Obras",
    start:    "2026-08-17",
    delivery: "2026-08-21",
  },
  {
    id: "cmsot2xs5004a9s2wqjyn7s4c",
    title: "Melhoria do Fluxo de Desligamento e Devolução de Ativos",
    start:    "2026-08-17",
    delivery: "2026-08-28",
  },
];

async function main() {
  console.log(`Atualizando ${UPDATES.length} demandas do Hildo Sousa...\n`);

  for (const u of UPDATES) {
    await prisma.demand.update({
      where: { id: u.id },
      data: {
        plannedStartDate:    new Date(`${u.start}T00:00:00.000Z`),
        plannedDeliveryDate: new Date(`${u.delivery}T00:00:00.000Z`),
      },
    });
    console.log(`✓ ${u.title}`);
    console.log(`  ${u.start} → ${u.delivery}`);
  }

  console.log("\nConcluído.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
