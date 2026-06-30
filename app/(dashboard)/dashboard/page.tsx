import { requireAuth, toPermissionUser } from "@/server/auth/helpers";
import { prisma }            from "@/lib/prisma";
import { dashboardService }  from "@/services/dashboardService";
import { canViewBenchmark }  from "@/server/auth/permissions";
import { calculateBenchmarkTotals } from "@/lib/benchmark/calculateBenchmarkTotals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthlySummaryFilters } from "@/components/dashboard/monthly-summary-filters";
import { MonthlySummaryTable }   from "@/components/dashboard/monthly-summary-table";
import { Separator }             from "@/components/ui/separator";
import { Users, ClipboardList, CheckCircle, Clock, BarChart3, TrendingDown } from "lucide-react";
import { Suspense } from "react";

export const metadata = { title: "Dashboard — Gestor de Demandas" };

// ── Tipos dos search params ───────────────────────────────────────

type SearchParams = {
  month?:      string;
  year?:       string;
  assigneeId?: string;
  role?:       string;
  profile?:    string;
  sortBy?:     string;
  sortDir?:    string;
};

// ── Skeleton do resumo (SSR suspense) ────────────────────────────

function SummarySkeleton() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border h-20 bg-muted/40 animate-pulse" />
        ))}
      </div>
      <div className="rounded-lg border h-40 bg-muted/20 animate-pulse" />
    </div>
  );
}

// ── Seção de resumo (async) ───────────────────────────────────────

async function MonthlySummarySection({
  sp,
  forcedAssigneeId,
}: {
  sp:                SearchParams;
  forcedAssigneeId?: string; // DEV: força assigneeId = actor.id
}) {
  const now   = new Date();
  const month = Math.max(1, Math.min(12, parseInt(sp.month ?? String(now.getMonth() + 1), 10) || now.getMonth() + 1));
  const year  = parseInt(sp.year ?? String(now.getFullYear()), 10) || now.getFullYear();

  const isSelfOnly = !!forcedAssigneeId;

  const [summary, collaborators] = await Promise.all([
    dashboardService.getMonthlySummary(month, year, {
      assigneeId: forcedAssigneeId ?? sp.assigneeId,
      // DEV não pode filtrar por outro papel/perfil
      role:       isSelfOnly ? undefined : sp.role,
      profile:    isSelfOnly ? undefined : sp.profile,
      sortBy:     sp.sortBy,
      sortDir:    sp.sortDir,
    }),
    isSelfOnly
      ? Promise.resolve([])
      : dashboardService.getDevCollaborators(),
  ]);

  return (
    <>
      <MonthlySummaryFilters collaborators={collaborators} isSelfOnly={isSelfOnly} />
      <MonthlySummaryTable
        data={summary}
        sortBy={sp.sortBy   ?? "finalValue"}
        sortDir={sp.sortDir ?? "desc"}
      />
    </>
  );
}

// ── Página principal ──────────────────────────────────────────────

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireAuth();
  const actor   = toPermissionUser(session);
  const sp      = await searchParams;

  // DEV vê apenas seus próprios dados — layout idêntico ao admin/gestor
  const isSelfOnly      = actor.role === "DEV";
  const forcedAssigneeId = isSelfOnly ? actor.id : undefined;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Para DEV escopa contagens às suas demandas; para outros, contagem global
  const demandWhere = isSelfOnly ? { assigneeId: actor.id } : {};

  const [totalUsers, totalDemands, homologadas, emDesenvolvimento] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),          // sempre global (informativo)
    prisma.demand.count({ where: demandWhere }),
    prisma.demand.count({ where: { ...demandWhere, status: "HOMOLOGADA_PRODUCAO" } }),
    prisma.demand.count({ where: { ...demandWhere, status: "EM_DESENVOLVIMENTO"  } }),
  ]);

  const [homologadoMes, valorPrevisto] = await Promise.all([
    prisma.demand.aggregate({
      _sum: { estimatedDemandValue: true },
      where: { ...demandWhere, homologationDate: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.demand.aggregate({
      _sum: { estimatedDemandValue: true },
      where: demandWhere,
    }),
  ]);

  const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const PCT = new Intl.NumberFormat("pt-BR", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const showBenchmark = canViewBenchmark(actor);
  let benchTotals = null;
  if (showBenchmark) {
    const benchDemands = await prisma.demand.findMany({
      where: {
        ...demandWhere,
        estimatedHours: { gt: 0 },
        assigneeProfileSnapshot: { not: null },
        status: { notIn: ["CANCELADA", "REPROVADA"] },
      },
      select: {
        estimatedHours:          true,
        assigneeProfileSnapshot: true,
        estimatedDemandValue:    true,
        hourlyRateSnapshot:      true,
      },
    });
    benchTotals = calculateBenchmarkTotals(benchDemands);
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho — idêntico para todos os papéis */}
      <div>
        <h1 className="text-2xl font-bold text-brand-text-dark">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Bem-vindo, {session.name}.</p>
      </div>

      {/* ── Cards de status — mesmos 4 do admin ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Usuários ativos</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {isSelfOnly ? "Minhas demandas" : "Total de demandas"}
            </CardTitle>
            <ClipboardList className="h-4 w-4 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDemands}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em desenvolvimento</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emDesenvolvimento}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Homologadas em produção</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{homologadas}</div>
          </CardContent>
        </Card>
      </div>

      {/* ── Cards financeiros — mesmos do admin, dados scopados para DEV ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Valor previsto — carteira total (informativo)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono text-blue-700">
              {BRL.format(valorPrevisto._sum.estimatedDemandValue ?? 0)}
            </p>
            <p className="text-xs text-blue-600 mt-0.5">
              Soma dos valores estimados de todas as demandas (todos os status). Deflator não aplicado.
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Valor homologado no mês atual (informativo)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono text-green-700">
              {BRL.format(homologadoMes._sum.estimatedDemandValue ?? 0)}
            </p>
            <p className="text-xs text-green-600 mt-0.5">
              Soma dos valores estimados das demandas homologadas este mês. Deflator não aplicado.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Cards de benchmark — apenas ADMIN / DIRETOR / GESTOR ── */}
      {showBenchmark && benchTotals && benchTotals.count > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-indigo-200 bg-indigo-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-indigo-700 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Valor nosso total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono text-indigo-700">
                  {BRL.format(benchTotals.totalOurValue)}
                </p>
                <p className="text-xs text-indigo-500 mt-0.5">
                  {benchTotals.count} demanda{benchTotals.count !== 1 ? "s" : ""} com dados de senioridade
                </p>
              </CardContent>
            </Card>

            <Card className="border-violet-200 bg-violet-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-violet-700 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Bench de mercado ajustado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono text-violet-700">
                  {BRL.format(benchTotals.totalMarketBenchAdjusted)}
                </p>
                <p className="text-xs text-violet-500 mt-0.5">
                  Custo equivalente de mercado (acelerador 10%)
                </p>
              </CardContent>
            </Card>

            <Card className="border-emerald-200 bg-emerald-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-emerald-700 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Economia estimada total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono text-emerald-700">
                  {BRL.format(benchTotals.totalEconomy)}
                </p>
                <p className="text-xs text-emerald-500 mt-0.5">
                  Bench ajustado − valor nosso (demandas ativas)
                </p>
              </CardContent>
            </Card>

            <Card className="border-teal-200 bg-teal-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-teal-700 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  % média de economia
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono text-teal-700">
                  {PCT.format(benchTotals.averageEconomyPercent)}
                </p>
                <p className="text-xs text-teal-500 mt-0.5">
                  Economia / bench ajustado total
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* ── Resumo mensal — mesmo título e layout do admin ── */}
      <Separator />
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-brand-text-dark">
          Resumo mensal por colaborador
        </h2>
        <p className="text-xs text-muted-foreground">
          Valor estimado = demandas aprovadas no período · Valor final = demandas homologadas no período (após deflator)
        </p>
      </div>
      <Suspense fallback={<SummarySkeleton />}>
        <MonthlySummarySection sp={sp} forcedAssigneeId={forcedAssigneeId} />
      </Suspense>
    </div>
  );
}
