import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users, ClipboardList, Clock, DollarSign,
  BadgeCheck, AlertCircle, TrendingUp,
} from "lucide-react";
import type { DapClosingPreview } from "@/types";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type Props = { preview: DapClosingPreview };

export function DapSummaryCards({ preview }: Props) {
  const cards = [
    {
      label: "Devs no período",
      value: String(preview.totalDevs),
      icon: Users,
      color: "text-blue-600", bg: "border-blue-200 bg-blue-50/60",
    },
    {
      label: "Demandas homologadas",
      value: String(preview.totalDemands),
      icon: ClipboardList,
      color: "text-violet-600", bg: "border-violet-200 bg-violet-50/60",
    },
    {
      label: "Total de horas",
      value: `${preview.totalEstimatedHours}h`,
      icon: Clock,
      color: "text-purple-600", bg: "border-purple-200 bg-purple-50/60",
    },
    {
      label: "Valor estimado total",
      value: BRL.format(preview.totalEstimatedValue),
      icon: DollarSign,
      color: "text-emerald-600", bg: "border-emerald-200 bg-emerald-50/60",
      mono: true,
    },
    {
      label: "Extratos assinados",
      value: `${preview.signedCount + preview.exportedCount} / ${preview.totalDevs}`,
      icon: BadgeCheck,
      color: "text-emerald-600", bg: "border-emerald-200 bg-emerald-50/60",
    },
    {
      label: "Pendentes de assinatura",
      value: String(preview.pendingCount),
      icon: AlertCircle,
      color: preview.pendingCount > 0 ? "text-amber-600" : "text-slate-400",
      bg:   preview.pendingCount > 0 ? "border-amber-200 bg-amber-50/60" : "border-slate-200 bg-slate-50/40",
    },
    {
      label: "Taxa de assinatura",
      value: `${preview.signaturePercentage}%`,
      icon: TrendingUp,
      color: preview.signaturePercentage === 100 ? "text-emerald-600" : "text-amber-600",
      bg:   preview.signaturePercentage === 100 ? "border-emerald-200 bg-emerald-50/60" : "border-amber-200 bg-amber-50/60",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      {cards.map((c) => (
        <Card key={c.label} className={c.bg}>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className={`text-xs font-medium flex items-center gap-1.5 ${c.color}`}>
              <c.icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{c.label}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <p className={`text-xl font-bold ${c.color} ${c.mono ? "font-mono text-base" : ""} truncate`}>
              {c.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
