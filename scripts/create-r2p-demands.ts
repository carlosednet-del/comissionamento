import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const LUCIANO_ID = "cmpv9erbr0000xbm95xuii0v8";
const ADMIN_ID   = "7baac510-4800-40c1-8cc9-288311be06c2";

const DEMANDS = [
  {
    title:               "REQ-to-PAY - Solicitação e Mapas de Materiais",
    description:         "Concluir o módulo de Solicitação e Mapas de Materiais para obras em andamento, estruturando o fluxo de solicitação, consolidação das necessidades, mapa de materiais, responsáveis, aprovações e rastreabilidade do processo até a disponibilização para as etapas seguintes de suprimentos.",
    systemAffected:      "REQ-to-PAY, processos de suprimentos, obras e integrações relacionadas ao fluxo de materiais.",
    businessProblem:     "O processo de solicitação de materiais pode apresentar controles paralelos, baixa rastreabilidade e dificuldade de consolidar necessidades das obras, gerando retrabalho, atrasos e menor previsibilidade para suprimentos.",
    expectedResult:      "Disponibilizar um fluxo sistêmico e rastreável para solicitação e consolidação de materiais, com visão clara das demandas por obra e suporte ao processo de compras.",
    impactDescription:   "Maior controle das solicitações, redução de retrabalho, melhor planejamento de suprimentos e maior rastreabilidade das necessidades das obras.",
    dependencies:        "Validação das regras com Obras e Suprimentos, disponibilidade dos usuários-chave e definição dos pontos de aprovação.",
    risks:               "Alterações de processo durante o desenvolvimento, dependência de regras ainda não formalizadas ou necessidade de integração com sistemas externos.",
    observations:        "O aceite do ciclo considera o módulo concluído ou em condição de homologação até 30/09/2026, com pendências externas devidamente registradas.",
    acceptanceCriteria:  "Fluxo de solicitação implementado. Mapa de materiais disponível. Responsáveis e etapas de aprovação definidos. Rastreabilidade das solicitações disponível. Homologação com usuários-chave realizada ou agendada com versão estável.",
    start:               "2026-08-11",
    delivery:            "2026-09-30",
    hours:               80,
    priority:            "ALTA"  as const,
    complexity:          "ALTA"  as const,
    roi:                 "ALTO"  as const,
  },
  {
    title:               "REQ-to-PAY - Lançamento de Notas e Títulos",
    description:         "Desenvolver e implantar o módulo de lançamento de notas e títulos para obras a iniciar, garantindo vínculo com empreendimento, fornecedor, documentos financeiros, vencimentos e informações necessárias para continuidade do processo de pagamento.",
    systemAffected:      "REQ-to-PAY, financeiro, contas a pagar e processos de obras a iniciar.",
    businessProblem:     "O lançamento de notas e títulos sem um fluxo padronizado pode gerar retrabalho, divergências de informação, baixa rastreabilidade e atrasos na continuidade do processo de pagamento.",
    expectedResult:      "Estabelecer um processo sistêmico para registro de notas e títulos, com informações estruturadas e rastreáveis desde a origem até a etapa seguinte do pagamento.",
    impactDescription:   "Redução de erros manuais, aumento da confiabilidade dos dados financeiros, maior controle do fluxo e melhoria do tempo de processamento.",
    dependencies:        "Definição das regras financeiras, validação com usuários-chave e disponibilidade dos dados necessários para testes.",
    risks:               "Mudanças em regras fiscais/financeiras, dependência de integrações ou necessidade de ajustes após homologação.",
    observations:        "A conclusão prevista para 30/09/2026 considera o módulo implantado ou em condição de homologação, conforme dependências externas e validações de negócio.",
    acceptanceCriteria:  "Cadastro e lançamento de notas funcionando. Títulos gerados/registrados com informações obrigatórias. Vínculo com empreendimento e fornecedor validado. Regras de vencimento e dados financeiros testadas. Fluxo homologado pelos usuários responsáveis.",
    start:               "2026-08-17",
    delivery:            "2026-09-30",
    hours:               80,
    priority:            "ALTA"  as const,
    complexity:          "ALTA"  as const,
    roi:                 "ALTO"  as const,
  },
  {
    title:               "REQ-to-PAY - DRE e Viabilidade",
    description:         "Consolidar o módulo de DRE e Viabilidade, considerando a funcionalidade de viabilidade já concluída e finalizando as premissas necessárias para construção e acompanhamento da DRE, com validação das regras junto às áreas responsáveis.",
    systemAffected:      "REQ-to-PAY, DRE, viabilidade econômico-financeira e bases de dados relacionadas.",
    businessProblem:     "A ausência das premissas finais da DRE impede a consolidação completa da visão econômico-financeira e limita o uso integrado das informações de viabilidade.",
    expectedResult:      "Concluir o módulo com premissas de DRE definidas, cálculos e visualizações validados e integração lógica com a viabilidade já implementada.",
    impactDescription:   "Maior confiabilidade das análises, melhor apoio à decisão e padronização das premissas utilizadas na avaliação econômico-financeira.",
    dependencies:        "Definição das premissas pela área de negócio, disponibilidade dos responsáveis pela validação e dados de referência.",
    risks:               "Atraso na definição das premissas ou necessidade de revisão de regras após validação inicial.",
    observations:        "A viabilidade já está concluída. O foco desta macroatividade é finalizar e validar as premissas da DRE até 21/08/2026.",
    acceptanceCriteria:  "Premissas da DRE definidas e documentadas. Regras de cálculo implementadas/ajustadas. Resultados validados com usuários-chave. Integração lógica com a viabilidade confirmada. Módulo concluído até 21/08/2026.",
    start:               "2026-08-11",
    delivery:            "2026-08-21",
    hours:               40,
    priority:            "MEDIA"  as const,
    complexity:          "MEDIA"  as const,
    roi:                 "MEDIO"  as const,
  },
];

async function main() {
  console.log("Criando 3 demandas REQ-to-PAY...\n");

  for (const d of DEMANDS) {
    const created = await prisma.demand.create({
      data: {
        title:               d.title,
        description:         d.description,
        requesterArea:       "Diretoria",
        requesterName:       "Gabriel Sarkis",
        requesterEmail:      "gabriel@7lm.com.br",
        demandType:          "NOVA_SOLUCAO",
        priority:            d.priority,
        complexity:          d.complexity,
        roi:                 d.roi,
        status:              "EM_DESENVOLVIMENTO",
        estimatedHours:      d.hours,
        isPedra:             true,
        systemAffected:      d.systemAffected,
        businessProblem:     d.businessProblem,
        expectedResult:      d.expectedResult,
        impactDescription:   d.impactDescription,
        dependencies:        d.dependencies,
        risks:               d.risks,
        observations:        d.observations,
        acceptanceCriteria:  d.acceptanceCriteria,
        plannedStartDate:    new Date(`${d.start}T00:00:00.000Z`),
        plannedDeliveryDate: new Date(`${d.delivery}T00:00:00.000Z`),
        assignee:            { connect: { id: LUCIANO_ID } },
        creator:             { connect: { id: ADMIN_ID } },
      },
      select: { id: true, title: true },
    });
    console.log(`✓ [${created.id}] ${created.title}`);
    console.log(`  ${d.start} → ${d.delivery} | ${d.hours}h | ${d.priority} | ROI ${d.roi}`);
  }

  console.log("\n3 demandas criadas com sucesso.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
