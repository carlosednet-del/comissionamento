import type { DemandStatus } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STATUS_CONFIG } from "./status-badge";
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Hourglass,
} from "lucide-react";

type Props = {
  stats: Partial<Record<DemandStatus, number>>;
};

const HIGHLIGHT_GROUPS: {
  label: string;
  statuses: DemandStatus[];
  icon: React.ElementType;
  color: string;
}[] = [
  {
    label: "Em aberto",
    statuses: ["ABERTA", "EM_ANALISE", "APROVADA"],
    icon: ClipboardList,
    color: "text-blue-600",
  },
  {
    label: "Em desenvolvimento",
    statuses: ["EM_DESENVOLVIMENTO"],
    icon: Clock,
    color: "text-brand-primary",
  },
  {
    label: "Aguardando homologação",
    statuses: ["AGUARDANDO_HOMOLOGACAO"],
    icon: Hourglass,
    color: "text-orange-600",
  },
  {
    label: "Concluídas / Homologadas",
    statuses: ["HOMOLOGADA_PRODUCAO", "CONCLUIDA"],
    icon: CheckCircle2,
    color: "text-green-600",
  },
  {
    label: "Reprovadas",
    statuses: ["REPROVADA"],
    icon: AlertTriangle,
    color: "text-amber-600",
  },
  {
    label: "Canceladas",
    statuses: ["CANCELADA"],
    icon: XCircle,
    color: "text-slate-500",
  },
];

function sum(stats: Partial<Record<DemandStatus, number>>, statuses: DemandStatus[]): number {
  return statuses.reduce((acc, s) => acc + (stats[s] ?? 0), 0);
}

export function DemandStats({ stats }: Props) {
  const total = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      {/* Totalizador */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total de demandas
          </CardTitle>
          <ClipboardList className="h-4 w-4 text-brand-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-brand-text-dark">{total}</div>
        </CardContent>
      </Card>

      {/* Grid de grupos */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {HIGHLIGHT_GROUPS.map(({ label, statuses, icon: Icon, color }) => {
          const count = sum(stats, statuses);
          return (
            <Card key={label} className="text-center">
              <CardHeader className="pb-1 pt-3 px-3">
                <Icon className={`mx-auto h-5 w-5 ${color}`} />
              </CardHeader>
              <CardContent className="pb-3 px-3">
                <div className="text-2xl font-bold">{count}</div>
                <p className="text-xs text-muted-foreground leading-tight mt-0.5">{label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Linha de status detalhada */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(STATUS_CONFIG) as DemandStatus[]).map((status) => {
          const count = stats[status] ?? 0;
          if (count === 0) return null;
          const { label, style } = STATUS_CONFIG[status];
          return (
            <span
              key={status}
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${style}`}
            >
              {label}: {count}
            </span>
          );
        })}
      </div>
    </div>
  );
}
