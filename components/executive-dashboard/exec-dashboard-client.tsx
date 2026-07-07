"use client";

import { useState, useTransition, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, TrendingDown, Star, Users, DollarSign, BarChart3, Clock } from "lucide-react";
import { toast } from "sonner";

import { ExecFilters }          from "./exec-filters";
import { ExecKpiCards }         from "./exec-kpi-cards";
import { ExecExportButton }     from "./exec-export-button";
import { ExecTabOverview }      from "./exec-tab-overview";
import { ExecTabCollaborators } from "./exec-tab-collaborators";
import { ExecTabProfile }       from "./exec-tab-profile";
import { ExecTabAreas }         from "./exec-tab-areas";
import { ExecTabDirectors }     from "./exec-tab-directors";
import { ExecTabDemands }       from "./exec-tab-demands";

import { getExecDashboardDataAction } from "@/server/actions/executiveDashboardActions";
import type { ExecDashboardData }     from "@/services/executiveDashboardService";
import type { ExecutiveDashboardFilters } from "@/validations/executive-dashboard";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const NUM = new Intl.NumberFormat("pt-BR");

type Director     = { id: string; name: string; role: string };
type Collaborator = { id: string; name: string; workerProfile: string | null };

type Props = {
  initialData:    ExecDashboardData;
  initialFilters: ExecutiveDashboardFilters;
  directors:      Director[];
  collaborators:  Collaborator[];
};

// ── Narrativa executiva ────────────────────────────────────────────

function NarrativeBar({ data }: { data: ExecDashboardData }) {
  const { summary } = data;
  if (summary.totalDemands === 0) return null;
  const pct = `${(summary.economyPercent * 100).toFixed(0)}%`;

  return (
    <div className="rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
      No período selecionado, foram homologadas{" "}
      <strong className="text-[#007EB5]">{NUM.format(summary.totalDemands)} demandas</strong>,
      totalizando{" "}
      <strong className="text-[#7C3AED]">{NUM.format(Math.round(summary.totalHours))}h entregues</strong>,{" "}
      <strong className="text-[#315A70]">{BRL.format(summary.totalEstimatedValue)} em valor interno</strong> e{" "}
      <strong className="text-[#16A34A]">{BRL.format(summary.totalEconomy)} de economia estimada</strong>{" "}
      ({pct} abaixo do mercado) frente ao benchmark de mercado.
    </div>
  );
}

// ── Painel de insights ─────────────────────────────────────────────

function InsightsPanel({ data }: { data: ExecDashboardData }) {
  const { summary, bySpecialty, bySeniority } = data;

  const topSpecialty = [...bySpecialty].sort((a, b) => b.estimatedValue - a.estimatedValue)[0];
  const topSeniority = [...bySeniority].sort((a, b) => b.estimatedValue - a.estimatedValue)[0];

  const SENIORITY_LABEL: Record<string, string> = {
    JUNIOR: "Júnior", PLENO: "Pleno", SENIOR: "Sênior", ESPECIALISTA: "Especialista",
  };

  type Insight = { icon: React.ElementType; color: string; text: React.ReactNode };

  const insights: Insight[] = [];

  if (summary.totalDemands > 0) {
    const pct = `${(summary.economyPercent * 100).toFixed(0)}%`;
    insights.push({
      icon: TrendingDown,
      color: "#16A34A",
      text: <>A economia de <strong>{BRL.format(summary.totalEconomy)}</strong> representa <strong>{pct}</strong> abaixo do mercado.</>,
    });
  }
  if (topSpecialty) {
    insights.push({
      icon: BarChart3,
      color: "#007EB5",
      text: <><strong>{topSpecialty.specialty}</strong> foi a especialidade com maior valor gerado ({BRL.format(topSpecialty.estimatedValue)}).</>,
    });
  }
  if (topSeniority) {
    const label = SENIORITY_LABEL[topSeniority.seniority] ?? topSeniority.seniority;
    insights.push({
      icon: Star,
      color: "#7C3AED",
      text: <>Senioridade <strong>{label}</strong> concentrou o maior volume financeiro do período.</>,
    });
  }
  if (summary.topCollaboratorName) {
    insights.push({
      icon: Users,
      color: "#F59E0B",
      text: <><strong>{summary.topCollaboratorName}</strong> lidera o ranking de colaboradores no período.</>,
    });
  }
  if (summary.topArea) {
    insights.push({
      icon: DollarSign,
      color: "#315A70",
      text: <><strong>{summary.topArea}</strong> foi a área com maior volume de demandas.</>,
    });
  }
  if (summary.averageHourlyCost > 0) {
    insights.push({
      icon: Clock,
      color: "#64748B",
      text: <>Custo/hora médio interno ficou em <strong>{BRL.format(summary.averageHourlyCost)}/h</strong>.</>,
    });
  }

  if (insights.length === 0) return null;

  return (
    <div className="rounded-xl border-0 ring-1 ring-border/60 bg-card shadow-sm p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
        <Star className="h-4 w-4 text-amber-500" />
        Insights do período
      </h3>
      <div className="space-y-3">
        {insights.map((ins, i) => {
          const Icon = ins.icon;
          return (
            <div key={i} className="flex gap-2.5 text-xs text-muted-foreground leading-relaxed">
              <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: ins.color }} />
              <span>{ins.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────

export function ExecDashboardClient({
  initialData,
  initialFilters,
  directors,
  collaborators,
}: Props) {
  const [filters,  setFilters]  = useState<ExecutiveDashboardFilters>(initialFilters);
  const [data,     setData]     = useState<ExecDashboardData>(initialData);
  const [isPending, startTransition] = useTransition();

  const handleFiltersChange = useCallback((newFilters: ExecutiveDashboardFilters) => {
    setFilters(newFilters);
    startTransition(async () => {
      const result = await getExecDashboardDataAction(newFilters);
      if (!result.success) {
        toast.error(result.error ?? "Erro ao carregar dados.");
        return;
      }
      if (result.data) {
        setData(result.data);
      }
    });
  }, []);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Executivo</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Produtividade, valor, senioridade, especialidade e economia das entregas homologadas
          </p>
        </div>
        <div className="flex items-center gap-2 pt-1">
          {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <ExecExportButton filters={filters} />
        </div>
      </div>

      {/* Narrativa */}
      <NarrativeBar data={data} />

      {/* Filtros */}
      <ExecFilters
        filters={filters}
        directors={directors}
        collaborators={collaborators}
        onChange={handleFiltersChange}
        loading={isPending}
      />

      {/* Conteúdo principal + sidebar */}
      <div
        className={`grid grid-cols-1 xl:grid-cols-[1fr_272px] gap-5 items-start transition-opacity ${isPending ? "opacity-60 pointer-events-none" : ""}`}
      >
        {/* Coluna principal */}
        <div className="space-y-5 min-w-0">
          {/* KPIs */}
          <ExecKpiCards summary={data.summary} />

          {/* Tabs */}
          <Tabs defaultValue="overview">
            <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="collaborators">Colaboradores</TabsTrigger>
              <TabsTrigger value="profile">Perfil Técnico</TabsTrigger>
              <TabsTrigger value="areas">Áreas</TabsTrigger>
              <TabsTrigger value="directors">Diretores</TabsTrigger>
              <TabsTrigger value="demands">Demandas</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <ExecTabOverview
                monthlySeries={data.monthlySeries}
                rankingCollaborators={data.rankingCollaborators}
                rankingAreas={data.rankingAreas}
                demands={data.demands}
                incomingVsHomologated={data.incomingVsHomologated}
                deadlineStats={data.deadlineStats}
              />
            </TabsContent>

            <TabsContent value="collaborators">
              <ExecTabCollaborators
                byCollaborator={data.byCollaborator}
                rankingCollaborators={data.rankingCollaborators}
                collaboratorMonthMatrix={data.collaboratorMonthMatrix}
                allMonths={data.allMonths}
              />
            </TabsContent>

            <TabsContent value="profile">
              <ExecTabProfile
                bySeniority={data.bySeniority}
                bySpecialty={data.bySpecialty}
                byMonthAndSeniority={data.byMonthAndSeniority}
                byMonthAndSpecialty={data.byMonthAndSpecialty}
                collaboratorMonthMatrix={data.collaboratorMonthMatrix}
                allMonths={data.allMonths}
              />
            </TabsContent>

            <TabsContent value="areas">
              <ExecTabAreas
                byArea={data.byArea}
                rankingAreas={data.rankingAreas}
              />
            </TabsContent>

            <TabsContent value="directors">
              <ExecTabDirectors
                byDirector={data.byDirector}
                rankingDirectors={data.rankingDirectors}
              />
            </TabsContent>

            <TabsContent value="demands">
              <ExecTabDemands demands={data.demands} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar de insights */}
        <div className="xl:sticky xl:top-6 space-y-4">
          <InsightsPanel data={data} />
        </div>
      </div>
    </div>
  );
}
