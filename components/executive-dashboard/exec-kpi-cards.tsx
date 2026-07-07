"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { ExecSummary } from "@/services/executiveDashboardService";
import {
  TrendingUp, Clock, DollarSign, BarChart2,
  Users, Award, Layers, PiggyBank,
} from "lucide-react";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const NUM = new Intl.NumberFormat("pt-BR");
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

type KpiCardProps = {
  title:    string;
  value:    string;
  subtitle?: string;
  icon:     React.ElementType;
  color:    string;
  bg:       string;
  primary?: boolean;
};

function KpiCard({ title, value, subtitle, icon: Icon, color, bg, primary }: KpiCardProps) {
  return (
    <Card className="shadow-sm border-0 ring-1 ring-border/60">
      <CardContent className={primary ? "p-5" : "p-4"}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground leading-none mb-2">{title}</p>
            <p className={`font-bold tracking-tight leading-none ${primary ? "text-2xl" : "text-xl"}`} style={{ color }}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1.5 leading-snug">{subtitle}</p>
            )}
          </div>
          <div className="shrink-0 h-9 w-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: bg }}>
            <Icon className="h-4 w-4" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ExecKpiCards({ summary }: { summary: ExecSummary }) {
  return (
    <div className="space-y-3">
      {/* Linha 1 — KPIs primários */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          primary
          title="Entregas homologadas"
          value={NUM.format(summary.totalDemands)}
          subtitle={summary.topArea ? `Top área: ${summary.topArea}` : "Demandas em produção"}
          icon={Layers}
          color="#007EB5"
          bg="#EFF8FF"
        />
        <KpiCard
          primary
          title="Horas entregues"
          value={`${NUM.format(Math.round(summary.totalHours))}h`}
          subtitle={`Média ${summary.averageHoursPerDemand.toFixed(1)}h por demanda`}
          icon={Clock}
          color="#7C3AED"
          bg="#F5F3FF"
        />
        <KpiCard
          primary
          title="Valor interno gerado"
          value={BRL.format(summary.totalEstimatedValue)}
          subtitle={`Ticket médio ${BRL.format(summary.averageTicket)}`}
          icon={DollarSign}
          color="#16A34A"
          bg="#F0FDF4"
        />
        <KpiCard
          primary
          title="Economia vs mercado"
          value={BRL.format(summary.totalEconomy)}
          subtitle={`${pct(summary.economyPercent)} abaixo do mercado`}
          icon={PiggyBank}
          color="#16A34A"
          bg="#F0FDF4"
        />
      </div>

      {/* Linha 2 — KPIs complementares */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          title="Benchmark de mercado"
          value={BRL.format(summary.totalBenchmarkValue)}
          subtitle={`Custo interno: ${BRL.format(summary.totalEstimatedValue)}`}
          icon={BarChart2}
          color="#315A70"
          bg="#F0F7FB"
        />
        <KpiCard
          title="Colaboradores ativos"
          value={NUM.format(summary.activeCollaborators)}
          subtitle={`Média ${summary.avgDemandsPerCollaborator.toFixed(1)} dem./colaborador`}
          icon={Users}
          color="#007EB5"
          bg="#EFF8FF"
        />
        <KpiCard
          title="Custo/hora médio"
          value={BRL.format(summary.averageHourlyCost)}
          subtitle="Custo hora interno médio"
          icon={TrendingUp}
          color="#7C3AED"
          bg="#F5F3FF"
        />
        <KpiCard
          title="Top colaborador"
          value={summary.topCollaboratorName ?? "—"}
          subtitle="Por valor gerado no período"
          icon={Award}
          color="#F59E0B"
          bg="#FFFBEB"
        />
      </div>
    </div>
  );
}
