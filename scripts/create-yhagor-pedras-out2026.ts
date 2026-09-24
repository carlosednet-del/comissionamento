import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const ADMIN_ID = "7baac510-4800-40c1-8cc9-288311be06c2";

const PEDRAS = [
  {
    title:       "Redução do Backlog de chamado",
    description: "Reduzir o volume de chamados em aberto no backlog, priorizando atendimentos pendentes e acelerando o fluxo de resolução.",
    demandType:  "OUTRO" as const,
  },
  {
    title:       "Entrega do Onboarding no prazo",
    description: "Garantir a entrega do processo de onboarding dentro dos prazos definidos, assegurando a integração adequada dos novos colaboradores.",
    demandType:  "OUTRO" as const,
  },
  {
    title:       "Implantar novo sistema de chamado",
    description: "Implantar o novo sistema de abertura e gestão de chamados, substituindo o processo atual e melhorando a rastreabilidade e eficiência do suporte.",
    demandType:  "NOVA_SOLUCAO" as const,
  },
  {
    title:       "Concluir inventário",
    description: "Concluir o inventário de ativos e equipamentos, garantindo a atualização completa do cadastro e a conformidade com os controles internos.",
    demandType:  "OUTRO" as const,
  },
];

async function main() {
  const yhagor = await prisma.user.findFirst({
    where: { name: { contains: "Yhagor", mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (!yhagor) { console.log("Yhagor não encontrado"); return; }
  console.log(`Yhagor: ${yhagor.id} — ${yhagor.name}\n`);

  // Ciclo outubro/2026: 16/09 → 15/10
  const plannedStartDate    = new Date("2026-09-16T00:00:00.000Z");
  const plannedDeliveryDate = new Date("2026-10-15T00:00:00.000Z");

  for (const p of PEDRAS) {
    const demand = await prisma.demand.create({
      data: {
        title:               p.title,
        description:         p.description,
        requesterArea:       "Diretoria",
        requesterName:       "Gabriel Sarkis",
        requesterEmail:      "gabriel@7lm.com.br",
        demandType:          p.demandType,
        priority:            "ALTA",
        status:              "APROVADA",
        isPedra:             true,
        estimatedHours:      20,
        plannedStartDate,
        plannedDeliveryDate,
        creator:  { connect: { id: ADMIN_ID } },
        assignee: { connect: { id: yhagor.id } },
      },
      select: { id: true, title: true, status: true, isPedra: true },
    });

    console.log(`✓ [${demand.id.slice(-6).toUpperCase()}] ${demand.title}`);
    console.log(`  status: ${demand.status} | isPedra: ${demand.isPedra}`);
  }

  console.log(`\n${PEDRAS.length} pedras criadas para ${yhagor.name} ✓`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
