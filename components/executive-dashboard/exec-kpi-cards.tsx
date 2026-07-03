"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExecSummary } from "@/services/executiveDashboardService";
import {
  TrendingUp, Clock, DollarSign, BarChart2,
  Users, Award, Layers, PiggyBank,
} from "lucide-react";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const NUM = new Intl.NumberFormat("pt-BR");
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const hrs = (n: number) => `${NUM.format(Math.round(n))}h`;

type KpiCardProps = {
  title:    string;
  value:    string;
  subtitle?: string;
  icon:     React.ElementType;
  accent?:  "green" | "blue" | "amber" | "violet" | "rose";
};

const ACCENT_MAP: Record<string, string> = {
  green:  "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950",
  blue:   "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950",
  amber:  "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950",
  violet: "text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-950",
  rose:   "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950",
};

function KpiCard({ title, value, subtitle, icon: Icon, accent = "blue" }: KpiCardProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${ACCENT_MAP[accent]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

export function ExecKpiCards({ summary }: { summary: ExecSummary }) {
  const cards: KpiCardProps[] = [
    {
      title:    "Demandas Homologadas",
      value:    NUM.format(summary.totalDemands),
      subtitle: summary.topArea ? `Top área: ${summary.topArea}` : undefined,
      icon:     Layers,
      accent:   "blue",
    },
    {
      title:    "Horas Entregues",
      value:    hrs(summary.totalHours),
      subtitle: `Média ${summary.averageHoursPerDemand.toFixed(1)}h / demanda`,
      icon:     Clock,
      accent:   "violet",
    },
    {
      title:    "Valor Interno Total",
      value:    BRL.format(summary.totalEstimatedValue),
      subtitle: `Ticket médio ${BRL.format(summary.averageTicket)}`,
      icon:     DollarSign,
      accent:   "amber",
    },
    {
      title:    "Economia vs Mercado",
      value:    BRL.format(summary.totalEconomy),
      subtitle: `${pct(summary.economyPercent)} abaixo do mercado`,
      icon:     PiggyBank,
      accent:   "green",
    },
    {
      title:    "Benchmark Mercado",
      value:    BRL.format(summary.totalBenchmarkValue),
      subtitle: `Custo interno: ${BRL.format(summary.totalEstimatedValue)}`,
      icon:     BarChart2,
      accent:   "rose",
    },
    {
      title:    "Colaboradores Ativos",
      value:    NUM.format(summary.activeCollaborators),
      subtitle: `Média ${summary.avgDemandsPerCollaborator.toFixed(1)} dem./colaborador`,
      icon:     Users,
      accent:   "blue",
    },
    {
      title:    "Custo/Hora Médio",
      value:    BRL.format(summary.averageHourlyCost),
      subtitle: "Custo hora interno médio",
      icon:     TrendingUp,
      accent:   "violet",
    },
    {
      title:    "Top Colaborador",
      value:    summary.topCollaboratorName ?? "—",
      subtitle: "Por valor gerado",
      icon:     Award,
      accent:   "amber",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((c) => <KpiCard key={c.title} {...c} />)}
    </div>
  );
}
