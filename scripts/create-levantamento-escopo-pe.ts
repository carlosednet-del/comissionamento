import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const ADMIN_ID = "7baac510-4800-40c1-8cc9-288311be06c2";

const NOVAS = [
  {
    title:       "Planejamento Estratégico — Levantamento de Escopo: Gestão de Repasse",
    description: "Levantamento e definição do escopo do módulo de Gestão de Repasse dentro do Planejamento Estratégico.",
  },
  {
    title:       "Planejamento Estratégico — Levantamento de Escopo: Visão Financeira",
    description: "Levantamento e definição do escopo do módulo de Visão Financeira dentro do Planejamento Estratégico.",
  },
];

async function main() {
  const luiz = await prisma.user.findFirst({
    where: { name: { contains: "Luiz", mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (!luiz) { console.log("Luiz não encontrado"); return; }
  console.log(`Responsável: ${luiz.name}\n`);

  const start = new Date("2026-09-23T00:00:00.000Z"); // ontem
  const end   = new Date("2026-10-02T00:00:00.000Z"); // próxima sexta

  for (const d of NOVAS) {
    const demand = await prisma.demand.create({
      data: {
        title:               d.title,
        description:         d.description,
        requesterArea:       "Diretoria",
        requesterName:       "Gabriel Sarkis",
        requesterEmail:      "gabriel@7lm.com.br",
        demandType:          "NOVA_SOLUCAO",
        priority:            "ALTA",
        status:              "EM_DESENVOLVIMENTO",
        isPedra:             false,
        estimatedHours:      8,
        plannedStartDate:    start,
        plannedDeliveryDate: end,
        creator:  { connect: { id: ADMIN_ID } },
        assignee: { connect: { id: luiz.id } },
      },
      select: { id: true, title: true, status: true, plannedStartDate: true, plannedDeliveryDate: true },
    });

    const s = demand.plannedStartDate?.toISOString().slice(0,10);
    const e = demand.plannedDeliveryDate?.toISOString().slice(0,10);
    console.log(`✓ [${demand.id.slice(-6).toUpperCase()}] ${demand.title}`);
    console.log(`  status: ${demand.status} | ${s} → ${e}`);
  }

  console.log("\n2 demandas criadas ✓");
}

main().catch(console.error).finally(() => prisma.$disconnect());
