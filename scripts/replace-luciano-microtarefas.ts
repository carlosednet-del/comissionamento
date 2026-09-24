import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const ADMIN_ID   = "7baac510-4800-40c1-8cc9-288311be06c2";
const LUCIANO_ID = "cmpv9erbr0000xbm95xuii0v8";

function utc(y: number, m: number, d: number) {
  return new Date(`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}T00:00:00.000Z`);
}

const MICROTAREFAS = [
  // Fase 1: Levantamento e desenho
  { title: "REQ-to-PAY — Análise do protótipo e documento de validação", desc: "Análise do protótipo do Gabriel e do documento da reunião de validação (01–04/09).", start: utc(2026,9,1),  end: utc(2026,9,4)  },
  { title: "REQ-to-PAY — Mapeamento das fontes de dados (Sienge + Mega)", desc: "Mapeamento das fontes de dados: movimentações bancárias, títulos e extrato de cliente do Sienge, e a planilha do Mega (08–10/09).", start: utc(2026,9,8),  end: utc(2026,9,10) },
  { title: "REQ-to-PAY — Definição da arquitetura (ETL e motor de cálculo)", desc: "Definição da arquitetura: leitura só do banco, carga pelo ETL e motor de cálculo testável (11/09).", start: utc(2026,9,11), end: utc(2026,9,11) },
  // Fase 2: Integração do realizado
  { title: "REQ-to-PAY — Ligação dos centros de custo do Sienge por empreendimento", desc: "Ligação dos centros de custo do Sienge a cada empreendimento (14–16/09).", start: utc(2026,9,14), end: utc(2026,9,16) },
  { title: "REQ-to-PAY — Regra Implantação Mega (evitar dupla contagem)", desc: "Análise da planilha do Mega e da regra que evita contar em dobro a \"Implantação Mega\" (17–19/09).", start: utc(2026,9,17), end: utc(2026,9,19) },
  { title: "REQ-to-PAY — Base de lançamentos auditável (EPIC A) e escopo por obra", desc: "Base de lançamentos auditável (EPIC A) e escopo por obra em todas as rotas (20/09).", start: utc(2026,9,20), end: utc(2026,9,20) },
  { title: "REQ-to-PAY — Reclassificação e regra do Mega no fluxo", desc: "Reclassificação e regra do Mega passam a valer no fluxo (20/09).", start: utc(2026,9,20), end: utc(2026,9,20) },
  { title: "REQ-to-PAY — Carga real de DF010 e DF011 no ambiente de teste", desc: "Carga real de DF010 e DF011 no ambiente de teste (20–21/09).", start: utc(2026,9,20), end: utc(2026,9,21) },
  { title: "REQ-to-PAY — Ingestão rastreável do Sienge e do Mega", desc: "Ingestão rastreável do Sienge e do Mega (21/09).", start: utc(2026,9,21), end: utc(2026,9,21) },
  { title: "REQ-to-PAY — Drill-down do fluxo de caixa até o lançamento", desc: "Drill-down do fluxo de caixa até o lançamento (21/09).", start: utc(2026,9,21), end: utc(2026,9,21) },
  { title: "REQ-to-PAY — Fluxo de Caixa consolidado movido para a Viabilidade", desc: "Fluxo de Caixa consolidado da companhia movido para a Viabilidade (21/09).", start: utc(2026,9,21), end: utc(2026,9,21) },
  { title: "REQ-to-PAY — Validação contra o relatório oficial do Sienge (≈2–3%)", desc: "Validação contra o relatório oficial do Sienge (diferença de 2 a 3%) (21/09).", start: utc(2026,9,21), end: utc(2026,9,21) },
  { title: "REQ-to-PAY — Correção de filtros sem efeito", desc: "Correção de filtros sem efeito (21/09).", start: utc(2026,9,21), end: utc(2026,9,21) },
  // Fase 3: Paridade com o protótipo
  { title: "REQ-to-PAY — Decisão de escopo: módulo de fluxo de caixa (não DRE)", desc: "Decisão de escopo: o módulo é de fluxo de caixa, não DRE (22/09).", start: utc(2026,9,22), end: utc(2026,9,22) },
  { title: "REQ-to-PAY — Motor de cálculo corrigido (paridade ao centavo)", desc: "Motor de cálculo corrigido, batendo ao centavo com o protótipo (22/09).", start: utc(2026,9,22), end: utc(2026,9,22) },
  { title: "REQ-to-PAY — Base de dados, cadastros, Carteira, Apoio e Comparativa", desc: "Base de dados, cadastros, Carteira (todas as versões), Apoio e Comparativa (22/09).", start: utc(2026,9,22), end: utc(2026,9,22) },
  { title: "REQ-to-PAY — Editor da versão e Portfólio", desc: "Editor da versão e Portfólio (22/09).", start: utc(2026,9,22), end: utc(2026,9,22) },
  { title: "REQ-to-PAY — Esqueleto de contas e mapeamento de centros de custo", desc: "Esqueleto de contas (editor e filtros) e mapeamento de centros de custo na Qualidade da base (22/09).", start: utc(2026,9,22), end: utc(2026,9,22) },
  { title: "REQ-to-PAY — Unidades, estoque e ticket praticado do Sienge", desc: "Unidades, estoque e ticket praticado trazidos do Sienge (22/09).", start: utc(2026,9,22), end: utc(2026,9,22) },
  // Fase 4: Projeção e carteira do Sienge
  { title: "REQ-to-PAY — Viabilidade, Premissas, Realizado, Associativo e Big Numbers", desc: "Análise de Viabilidade, Premissas, Realizado, Associativo realizado e Big Numbers (23/09).", start: utc(2026,9,23), end: utc(2026,9,23) },
  { title: "REQ-to-PAY — Vendas com a régua de venda líquida", desc: "Vendas com a régua de venda líquida (23/09).", start: utc(2026,9,23), end: utc(2026,9,23) },
  { title: "REQ-to-PAY — Extrato de cliente do Sienge com carga automática (2×/dia)", desc: "Extrato de cliente vindo do Sienge, com carga automática duas vezes por dia. As telas comerciais passam a usar a carteira do Sienge (23/09).", start: utc(2026,9,23), end: utc(2026,9,23) },
  { title: "REQ-to-PAY — Cadastro de Projeção (projeção ★, corte travado, simulações)", desc: "Cadastro de Projeção: projeção ★, mês de corte travado e simulações (23/09).", start: utc(2026,9,23), end: utc(2026,9,23) },
  { title: "REQ-to-PAY — Telas com projeção ★: Torre, Empreendimento, DRE P×R, Custos", desc: "Telas que usam a projeção ★: Torre, Empreendimento, DRE P×R, Custos, Associativo e Fluxo (23/09).", start: utc(2026,9,23), end: utc(2026,9,23) },
  { title: "REQ-to-PAY — Sub-abas Simulação e Premissas, seletor de Cenário", desc: "Sub-abas Simulação e Premissas, e seletor de Cenário na Projeção (23/09).", start: utc(2026,9,23), end: utc(2026,9,23) },
  { title: "REQ-to-PAY — De/para pelo plano financeiro", desc: "De/para pelo plano financeiro (principal do financiamento à produção, juros e tarifas) (23/09).", start: utc(2026,9,23), end: utc(2026,9,23) },
  { title: "REQ-to-PAY — Projeções validadas em DF010, AGL035 e ALV001", desc: "Projeções validadas em DF010, AGL035 e ALV001 por Luciano (23/09).", start: utc(2026,9,23), end: utc(2026,9,23) },
];

async function main() {
  // 1. Deletar as 4 fases criadas anteriormente
  const deletadas = await prisma.demand.deleteMany({
    where: {
      assigneeId: LUCIANO_ID,
      isPedra: true,
      title: { contains: "REQ-to-PAY — Fase", mode: "insensitive" },
    },
  });
  console.log(`✓ Deletadas ${deletadas.count} fases antigas\n`);

  // 2. Criar micro-tarefas
  console.log("--- Criando micro-tarefas ---");
  for (const t of MICROTAREFAS) {
    const d = await prisma.demand.create({
      data: {
        title:                t.title,
        description:          t.desc,
        requesterArea:        "Diretoria",
        requesterName:        "Gabriel Sarkis",
        requesterEmail:       "gabriel@7lm.com.br",
        demandType:           "NOVA_SOLUCAO",
        priority:             "ALTA",
        status:               "HOMOLOGADA_PRODUCAO",
        isPedra:              true,
        estimatedHours:       0,
        estimatedDemandValue: 0,
        plannedStartDate:     t.start,
        plannedDeliveryDate:  t.end,
        actualDeliveryDate:   t.end,
        creator:  { connect: { id: ADMIN_ID } },
        assignee: { connect: { id: LUCIANO_ID } },
      },
      select: { id: true },
    });
    const s = t.start.toISOString().slice(0,10);
    const e = t.end.toISOString().slice(0,10);
    console.log(`  ✓ [${d.id.slice(-6).toUpperCase()}] ${s} → ${e}  ${t.title.slice(0,60)}`);
  }

  console.log(`\n${MICROTAREFAS.length} micro-tarefas criadas ✓`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
