import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const ADMIN_ID    = "7baac510-4800-40c1-8cc9-288311be06c2";
const LUCIANO_ID  = "cmpv9erbr0000xbm95xuii0v8";

function utc(y: number, m: number, d: number) {
  return new Date(`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}T00:00:00.000Z`);
}

const FASES = [
  {
    title:       "REQ-to-PAY — Fase 1: Levantamento e Desenho (DRE/Viabilidade)",
    description: `Análise do protótipo do Gabriel e do documento da reunião de validação (01–04/09).
Mapeamento das fontes de dados: movimentações bancárias, títulos e extrato de cliente do Sienge, e a planilha do Mega (08–10/09).
Definição da arquitetura: leitura só do banco, carga pelo ETL e motor de cálculo testável (11/09).`,
    start: utc(2026,9,1),  end: utc(2026,9,11),
  },
  {
    title:       "REQ-to-PAY — Fase 2: Integração do Realizado (DRE/Viabilidade)",
    description: `Ligação dos centros de custo do Sienge a cada empreendimento (14–16/09).
Análise da planilha do Mega e regra que evita contar em dobro a "Implantação Mega" (17–19/09).
Base de lançamentos auditável (EPIC A) e escopo por obra em todas as rotas (20/09).
Reclassificação e regra do Mega no fluxo (20/09).
Carga real de DF010 e DF011 no ambiente de teste (20–21/09).
Ingestão rastreável do Sienge e do Mega (21/09).
Drill-down do fluxo de caixa até o lançamento (21/09).
Fluxo de Caixa consolidado da companhia movido para a Viabilidade (21/09).
Validação contra o relatório oficial do Sienge (diferença de 2 a 3%) (21/09).
Correção de filtros sem efeito (21/09).`,
    start: utc(2026,9,14), end: utc(2026,9,21),
  },
  {
    title:       "REQ-to-PAY — Fase 3: Paridade com o Protótipo (DRE/Viabilidade)",
    description: `Decisão de escopo: o módulo é de fluxo de caixa, não DRE (22/09).
Motor de cálculo corrigido, batendo ao centavo com o protótipo (22/09).
Base de dados, cadastros, Carteira (todas as versões), Apoio e Comparativa (22/09).
Editor da versão e Portfólio (22/09).
Esqueleto de contas (editor e filtros) e mapeamento de centros de custo na Qualidade da base (22/09).
Unidades, estoque e ticket praticado trazidos do Sienge (22/09).`,
    start: utc(2026,9,22), end: utc(2026,9,22),
  },
  {
    title:       "REQ-to-PAY — Fase 4: Projeção e Carteira do Sienge (DRE/Viabilidade)",
    description: `Análise de Viabilidade, Premissas, Realizado, Associativo realizado e Big Numbers (23/09).
Vendas com a régua de venda líquida (23/09).
Extrato de cliente vindo do Sienge, com carga automática duas vezes por dia. Telas comerciais passam a usar a carteira do Sienge (23/09).
Cadastro de Projeção (projeção ★, mês de corte travado, simulações) (23/09).
Telas que usam a projeção ★: Torre, Empreendimento, DRE P×R, Custos, Associativo e Fluxo (23/09).
Sub-abas Simulação e Premissas, e seletor de Cenário na Projeção (23/09).
De/para pelo plano financeiro (23/09).
Projeções validadas em DF010, AGL035 e ALV001 (por Luciano) (23/09).`,
    start: utc(2026,9,23), end: utc(2026,9,23),
  },
];

async function main() {
  // 1. Deletar pedra antiga de DRE e Viabilidade
  const antiga = await prisma.demand.findFirst({
    where: {
      assigneeId: LUCIANO_ID,
      isPedra: true,
      title: { contains: "DRE e Viabilidade", mode: "insensitive" },
    },
    select: { id: true, title: true },
  });
  if (antiga) {
    await prisma.demand.delete({ where: { id: antiga.id } });
    console.log(`✓ Deletada: [${antiga.id.slice(-6).toUpperCase()}] ${antiga.title}`);
  } else {
    console.log("⚠ Pedra DRE e Viabilidade não encontrada");
  }

  // 2. Criar 4 fases
  console.log("\n--- Criando 4 fases ---");
  for (const f of FASES) {
    const d = await prisma.demand.create({
      data: {
        title:                f.title,
        description:          f.description,
        requesterArea:        "Diretoria",
        requesterName:        "Gabriel Sarkis",
        requesterEmail:       "gabriel@7lm.com.br",
        demandType:           "NOVA_SOLUCAO",
        priority:             "ALTA",
        status:               "HOMOLOGADA_PRODUCAO",
        isPedra:              true,
        estimatedHours:       0,
        estimatedDemandValue: 0,
        plannedStartDate:     f.start,
        plannedDeliveryDate:  f.end,
        actualDeliveryDate:   f.end,
        creator:  { connect: { id: ADMIN_ID } },
        assignee: { connect: { id: LUCIANO_ID } },
      },
      select: { id: true },
    });
    const s = f.start.toISOString().slice(0,10);
    const e = f.end.toISOString().slice(0,10);
    console.log(`  ✓ [${d.id.slice(-6).toUpperCase()}] ${f.title.slice(0,60)} | ${s} → ${e}`);
  }

  console.log("\nConcluído ✓");
}

main().catch(console.error).finally(() => prisma.$disconnect());
