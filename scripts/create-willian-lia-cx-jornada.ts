import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const ADMIN_ID  = "7baac510-4800-40c1-8cc9-288311be06c2";
const WILLIAN_ID = "cmpr1fzx90007al1wsl46sn0t";

// IDs dos 3 CX que já existem como pedra → desmarcar
const CX_PEDRA_IDS = [
  "cmpr1fzx90007al1wsl46sn0t".replace("cmpr1fzx90007al1wsl46sn0t","") , // placeholder
];

function utc(y: number, m: number, d: number) {
  return new Date(`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}T00:00:00.000Z`);
}

// Image 1 — LIA e CX (itens não-CX, não-destacados)
const LIA_CX = [
  {
    title:       "LIA e CX — Construção da LIA e das jornadas/disparos de CX",
    description: "Construção da LIA (IA de atendimento) e das jornadas/disparos de CX iniciada.",
    start: utc(2026,8,3),  end: utc(2026,8,30),
  },
  {
    title:       "LIA e CX — Início da validação dos fluxos e testes internos",
    description: "Início da validação dos fluxos de atendimento e testes internos.",
    start: utc(2026,8,31), end: utc(2026,9,6),
  },
  {
    title:       "LIA e CX — Validação do sistema, filas e fluxos de atendimento",
    description: "Validação do sistema, das filas e dos fluxos de atendimento.",
    start: utc(2026,9,7),  end: utc(2026,9,7),
  },
  {
    title:       "LIA e CX — Ajustes finos no sistema e nos fluxos de atendimento",
    description: "Ajustes finos no sistema e nos fluxos de atendimento (período 07–11/09).",
    start: utc(2026,9,7),  end: utc(2026,9,11),
  },
  {
    title:       "LIA e CX — Conclusão dos ajustes do sistema, fluxos de atendimento e IA",
    description: "Conclusão dos ajustes do sistema e dos fluxos de atendimento e IA.",
    start: utc(2026,9,15), end: utc(2026,9,20),
  },
];

// Image 2 — Jornada do Cliente (cronológico: 07/09 → 14/09 → 18/09 → 21/09 → 25/09)
const JORNADA = [
  {
    title:       "Jornada do Cliente — Construção do fluxo de atendimento e comunicação",
    description: "Construção do fluxo de atendimento e comunicação com o cliente.",
    start: utc(2026,9,7),  end: utc(2026,9,13),
  },
  {
    title:       "Jornada do Cliente — Início da validação dos fluxos e disparos",
    description: "Início da validação dos fluxos e disparos de CX.",
    start: utc(2026,9,14), end: utc(2026,9,17),
  },
  {
    title:       "Jornada do Cliente — Ajustes finos",
    description: "Ajustes finos no sistema e fluxos de atendimento.",
    start: utc(2026,9,18), end: utc(2026,9,20),
  },
  {
    title:       "Jornada do Cliente — Validação do sistema, filas e fluxos de atendimento",
    description: "Validação do sistema, das filas e dos fluxos de atendimento.",
    start: utc(2026,9,21), end: utc(2026,9,24),
  },
  {
    title:       "Jornada do Cliente — Entrega assistida do projeto rollout F10",
    description: "Entrega assistida do projeto rollout F10.",
    start: utc(2026,9,25), end: utc(2026,9,30),
  },
];

async function main() {
  // 1. Desmarcar isPedra dos 3 CX existentes
  console.log("--- Desmarcando isPedra dos 3 CRM/CX existentes ---");
  const cxDemands = await prisma.demand.findMany({
    where: {
      assigneeId: WILLIAN_ID,
      isPedra: true,
      title: { contains: "CRM Experiência do Cliente", mode: "insensitive" },
    },
    select: { id: true, title: true },
  });
  for (const d of cxDemands) {
    await prisma.demand.update({ where: { id: d.id }, data: { isPedra: false } });
    console.log(`  ✓ isPedra=false → [${d.id.slice(-6).toUpperCase()}] ${d.title.slice(0,55)}`);
  }

  // 2. Criar tarefas LIA e CX
  console.log("\n--- Criando tarefas LIA e CX ---");
  for (const t of LIA_CX) {
    const d = await prisma.demand.create({
      data: {
        title:                t.title,
        description:          t.description,
        requesterArea:        "Diretoria",
        requesterName:        "Gabriel Sarkis",
        requesterEmail:       "gabriel@7lm.com.br",
        demandType:           "OUTRO",
        priority:             "ALTA",
        status:               "HOMOLOGADA_PRODUCAO",
        isPedra:              true,
        estimatedHours:       0,
        estimatedDemandValue: 0,
        plannedStartDate:     t.start,
        plannedDeliveryDate:  t.end,
        actualDeliveryDate:   t.end,
        creator:  { connect: { id: ADMIN_ID } },
        assignee: { connect: { id: WILLIAN_ID } },
      },
      select: { id: true },
    });
    console.log(`  ✓ [${d.id.slice(-6).toUpperCase()}] ${t.title.slice(0,55)} | ${t.start.toISOString().slice(0,10)} → ${t.end.toISOString().slice(0,10)}`);
  }

  // 3. Criar tarefas Jornada do Cliente
  console.log("\n--- Criando tarefas Jornada do Cliente ---");
  for (const t of JORNADA) {
    const d = await prisma.demand.create({
      data: {
        title:                t.title,
        description:          t.description,
        requesterArea:        "Diretoria",
        requesterName:        "Gabriel Sarkis",
        requesterEmail:       "gabriel@7lm.com.br",
        demandType:           "OUTRO",
        priority:             "ALTA",
        status:               "HOMOLOGADA_PRODUCAO",
        isPedra:              true,
        estimatedHours:       0,
        estimatedDemandValue: 0,
        plannedStartDate:     t.start,
        plannedDeliveryDate:  t.end,
        actualDeliveryDate:   t.end,
        creator:  { connect: { id: ADMIN_ID } },
        assignee: { connect: { id: WILLIAN_ID } },
      },
      select: { id: true },
    });
    console.log(`  ✓ [${d.id.slice(-6).toUpperCase()}] ${t.title.slice(0,55)} | ${t.start.toISOString().slice(0,10)} → ${t.end.toISOString().slice(0,10)}`);
  }

  console.log("\nConcluído ✓");
}

main().catch(console.error).finally(() => prisma.$disconnect());
