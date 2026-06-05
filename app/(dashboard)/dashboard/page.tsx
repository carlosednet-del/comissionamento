import { requireAuth, toPermissionUser } from "@/server/auth/helpers";
import { canViewFinancialData }          from "@/server/auth/permissions";
import { prisma }            from "@/lib/prisma";
import { dashboardService }  from "@/services/dashboardService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthlySummaryFilters } from "@/components/dashboard/monthly-summary-filters";
import { MonthlySummaryTable }   from "@/components/dashboard/monthly-summary-table";
import { Separator }             from "@/components/ui/separator";
import { Users, ClipboardList, CheckCircle, Clock, UserCircle2 } from "lucide-react";
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
  isSelfOnly,
}: {
  sp:               SearchParams;
  forcedAssigneeId?: string;  // força assigneeId (DEV vê só a si mesmo)
  isSelfOnly?:       boolean;
}) {
  const now   = new Date();
  const month = Math.max(1, Math.min(12, parseInt(sp.month ?? String(now.getMonth() + 1), 10) || now.getMonth() + 1));
  const year  = parseInt(sp.year ?? String(now.getFullYear()), 10) || now.getFullYear();

  // Para visão pessoal: ignora filtros de colaborador/papel/perfil da URL
  const effectiveAssigneeId = forcedAssigneeId ?? sp.assigneeId;
  const effectiveRole       = isSelfOnly ? undefined : sp.role;
  const effectiveProfile    = isSelfOnly ? undefined : sp.profile;

  const [summary, collaborators] = await Promise.all([
    dashboardService.getMonthlySummary(month, year, {
      assigneeId: effectiveAssigneeId,
      role:       effectiveRole,
      profile:    effectiveProfile,
      sortBy:     sp.sortBy,
      sortDir:    sp.sortDir,
    }),
    isSelfOnly ? Promise.resolve([]) : dashboardService.getDevCollaborators(),
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

  // DEV vê apenas seus próprios números
  const isSelfOnly = actor.role === "DEV";

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Filtro de demandas: DEV vê só as suas
  const demandWhere = isSelfOnly ? { assigneeId: actor.id } : {};

  const [totalUsers, totalDemands, homologadas, emDesenvolvimento] = await Promise.all([
    isSelfOnly
      ? Promise.resolve(null)                                                                  // não relevante para DEV
      : prisma.user.count({ where: { isActive: true } }),
    prisma.demand.count({ where: demandWhere }),
    prisma.demand.count({ where: { ...demandWhere, status: "HOMOLOGADA_PRODUCAO" } }),
    prisma.demand.count({ where: { ...demandWhere, status: "EM_DESENVOLVIMENTO"  } }),
  ]);

  // Cards financeiros (só para quem tem permissão)
  const canSeeFinancial = canViewFinancialData(actor);

  const [homologadoMes, valorPrevisto] = canSeeFinancial
    ? await Promise.all([
        prisma.demand.aggregate({
          _sum: { estimatedDemandValue: true },
          where: { ...demandWhere, homologationDate: { gte: monthStart, lte: monthEnd } },
        }),
        prisma.demand.aggregate({
          _sum: { estimatedDemandValue: true },
          where: demandWhere,
        }),
      ])
    : [null, null];

  const stats = isSelfOnly
    ? [
        { label: "Minhas demandas",         value: totalDemands,      icon: ClipboardList, color: "text-violet-600" },
        { label: "Em desenvolvimento",      value: emDesenvolvimento, icon: Clock,         color: "text-amber-600"  },
        { label: "Homologadas em produção", value: homologadas,       icon: CheckCircle,   color: "text-green-600"  },
      ]
    : [
        { label: "Usuários ativos",         value: totalUsers!,       icon: Users,         color: "text-blue-600"   },
        { label: "Total de demandas",       value: totalDemands,      icon: ClipboardList, color: "text-violet-600" },
        { label: "Em desenvolvimento",      value: emDesenvolvimento, icon: Clock,         color: "text-amber-600"  },
        { label: "Homologadas em produção", value: homologadas,       icon: CheckCircle,   color: "text-green-600"  },
      ];

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-text-dark">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Bem-vindo, {session.name}.</p>
        </div>
        {isSelfOnly && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
            <UserCircle2 className="h-3.5 w-3.5" />
            Meus números
          </span>
        )}
      </div>

      {/* Cards de status */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cards financeiros (só para quem tem permissão) */}
      {canSeeFinancial && (homologadoMes || valorPrevisto) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Valor previsto — soma de todas as demandas */}
          {valorPrevisto && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Valor previsto — carteira total (informativo)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono text-blue-700">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                    valorPrevisto._sum.estimatedDemandValue ?? 0,
                  )}
                </p>
                <p className="text-xs text-blue-600 mt-0.5">
                  Soma dos valores estimados de todas as demandas (todos os status). Deflator não aplicado.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Valor homologado no mês corrente */}
          {homologadoMes && (
            <Card className="border-green-200 bg-green-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Valor homologado no mês atual (informativo)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono text-green-700">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                    homologadoMes._sum.estimatedDemandValue ?? 0,
                  )}
                </p>
                <p className="text-xs text-green-600 mt-0.5">
                  Soma dos valores estimados das demandas homologadas este mês. Deflator não aplicado.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Resumo mensal */}
      {canSeeFinancial && (
        <>
          <Separator />
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-brand-text-dark">
              {isSelfOnly ? "Meu resumo mensal" : "Resumo mensal por colaborador"}
            </h2>
            <p className="text-xs text-muted-foreground">
              Valor estimado = demandas aprovadas no período · Valor final = demandas homologadas no período (após deflator)
            </p>
          </div>
          <Suspense fallback={<SummarySkeleton />}>
            <MonthlySummarySection
              sp={sp}
              forcedAssigneeId={isSelfOnly ? actor.id : undefined}
              isSelfOnly={isSelfOnly}
            />
          </Suspense>
        </>
      )}
    </div>
  );
}
