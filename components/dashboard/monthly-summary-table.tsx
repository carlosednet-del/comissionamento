/**
 * MonthlySummaryTable — Tabela de resumo mensal por colaborador
 *
 * Mostra, para o período selecionado:
 *  · Valor estimado = SUM(estimatedDemandValue) das demandas aprovadas no mês
 *  · Valor final    = SUM(estimatedDemandValue) das demandas homologadas no mês
 *
 * ⚠  Deflator por atraso e fechamento de RV/comissão NÃO implementados.
 *    Ambos os valores são informativos.
 */

import type { MonthlyDashboardSummary } from "@/services/dashboardService";
import { WORKER_PROFILE_LABELS }         from "@/lib/demand-pricing";
import { cn }                            from "@/lib/utils";
import type { WorkerProfile }            from "@prisma/client";
import {
  InfoIcon,
  TrendingUp,
  ClipboardCheck,
  Clock,
} from "lucide-react";

// ── Formatação ────────────────────────────────────────────────────

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const NUM = new Intl.NumberFormat("pt-BR");

const MONTH_NAMES = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const PROFILE_STYLE: Record<WorkerProfile, string> = {
  JUNIOR:       "bg-slate-100 text-slate-700 border-slate-200",
  PLENO:        "bg-blue-50   text-blue-700  border-blue-200",
  SENIOR:       "bg-violet-50 text-violet-700 border-violet-200",
  ESPECIALISTA: "bg-amber-50  text-amber-700  border-amber-200",
};

// ── Props ─────────────────────────────────────────────────────────

type Props = {
  data: MonthlyDashboardSummary;
};

// ── Componente ────────────────────────────────────────────────────

export function MonthlySummaryTable({ data }: Props) {
  const { month, year, collaborators, totals } = data;
  const monthLabel = `${MONTH_NAMES[month]} / ${year}`;

  // ── Sem dados ──────────────────────────────────────────────────
  if (collaborators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
        <ClipboardCheck className="h-8 w-8 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">
          Nenhuma demanda aprovada ou homologada em {monthLabel}
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Ajuste o período ou os filtros acima
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* Aviso sobre valor final */}
      <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
        <InfoIcon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>
          <strong>Valor final</strong> = valor estimado das demandas homologadas no período.
          Deflator por atraso e fechamento de RV ainda não foram implementados.
        </span>
      </div>

      {/* Sumário rápido no topo */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryMini
          label="Aprovadas no período"
          value={NUM.format(totals.approvedCount)}
          sub={`${totals.approvedHours.toFixed(1)}h estimadas`}
          icon={TrendingUp}
          color="text-emerald-600"
          bg="bg-emerald-50 border-emerald-100"
        />
        <SummaryMini
          label="Valor estimado"
          value={BRL.format(totals.estimatedValue)}
          sub="demandas aprovadas"
          icon={TrendingUp}
          color="text-brand-primary"
          bg="bg-brand-bg-light border-brand-bg-mid"
        />
        <SummaryMini
          label="Homologadas no período"
          value={NUM.format(totals.homologatedCount)}
          sub={`${totals.homologatedHours.toFixed(1)}h entregues`}
          icon={ClipboardCheck}
          color="text-green-700"
          bg="bg-green-50 border-green-100"
        />
        <SummaryMini
          label="Valor final"
          value={BRL.format(totals.finalValue)}
          sub="demandas homologadas"
          icon={ClipboardCheck}
          color="text-green-700"
          bg="bg-green-50 border-green-100"
        />
      </div>

      {/* Tabela por colaborador */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Colaborador
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Perfil
              </th>
              {/* Valor estimado */}
              <th className="px-3 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide border-l border-dashed">
                Dem. aprovadas
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Horas est.
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-brand-primary uppercase tracking-wide">
                Valor estimado
              </th>
              {/* Valor final */}
              <th className="px-3 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide border-l border-dashed">
                Dem. homolog.
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Horas entreg.
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-green-700 uppercase tracking-wide">
                Valor final
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {collaborators.map((c, i) => (
              <tr
                key={c.assigneeId}
                className={cn(
                  "transition-colors hover:bg-muted/30",
                  i % 2 === 0 ? "bg-background" : "bg-muted/10",
                )}
              >
                {/* Nome */}
                <td className="px-4 py-3 font-medium text-brand-text-dark">
                  {c.assigneeName}
                </td>

                {/* Perfil */}
                <td className="px-3 py-3">
                  {c.assigneeProfile ? (
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                        PROFILE_STYLE[c.assigneeProfile],
                      )}
                    >
                      {WORKER_PROFILE_LABELS[c.assigneeProfile]}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </td>

                {/* Valor estimado */}
                <td className="px-3 py-3 text-right tabular-nums text-muted-foreground border-l border-dashed">
                  {c.approvedCount > 0 ? c.approvedCount : <span className="opacity-40">—</span>}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                  {c.approvedHours > 0
                    ? <span className="flex items-center justify-end gap-1"><Clock className="h-3 w-3" />{c.approvedHours.toFixed(1)}h</span>
                    : <span className="opacity-40">—</span>
                  }
                </td>
                <td className="px-3 py-3 text-right">
                  {c.estimatedValue > 0 ? (
                    <span className="font-mono font-semibold text-brand-primary">
                      {BRL.format(c.estimatedValue)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/40 text-xs">—</span>
                  )}
                </td>

                {/* Valor final */}
                <td className="px-3 py-3 text-right tabular-nums text-muted-foreground border-l border-dashed">
                  {c.homologatedCount > 0 ? c.homologatedCount : <span className="opacity-40">—</span>}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                  {c.homologatedHours > 0
                    ? <span className="flex items-center justify-end gap-1"><Clock className="h-3 w-3" />{c.homologatedHours.toFixed(1)}h</span>
                    : <span className="opacity-40">—</span>
                  }
                </td>
                <td className="px-3 py-3 text-right">
                  {c.finalValue > 0 ? (
                    <span className="font-mono font-semibold text-green-700">
                      {BRL.format(c.finalValue)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/40 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>

          {/* Linha de totais */}
          {collaborators.length > 1 && (
            <tfoot>
              <tr className="border-t-2 bg-muted/30 font-semibold">
                <td className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground" colSpan={2}>
                  Total — {collaborators.length} colaborador{collaborators.length !== 1 ? "es" : ""}
                </td>
                <td className="px-3 py-3 text-right tabular-nums border-l border-dashed">
                  {totals.approvedCount}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                  {totals.approvedHours > 0 && (
                    <span className="flex items-center justify-end gap-1">
                      <Clock className="h-3 w-3" />{totals.approvedHours.toFixed(1)}h
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-right">
                  <span className="font-mono text-brand-primary">
                    {BRL.format(totals.estimatedValue)}
                  </span>
                </td>
                <td className="px-3 py-3 text-right tabular-nums border-l border-dashed">
                  {totals.homologatedCount}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                  {totals.homologatedHours > 0 && (
                    <span className="flex items-center justify-end gap-1">
                      <Clock className="h-3 w-3" />{totals.homologatedHours.toFixed(1)}h
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-right">
                  <span className="font-mono text-green-700">
                    {BRL.format(totals.finalValue)}
                  </span>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

// ── Mini card de sumário ──────────────────────────────────────────

function SummaryMini({
  label, value, sub, icon: Icon, color, bg,
}: {
  label: string;
  value: string;
  sub:   string;
  icon:  React.ElementType;
  color: string;
  bg:    string;
}) {
  return (
    <div className={cn("rounded-lg border px-4 py-3 space-y-0.5", bg)}>
      <div className="flex items-center gap-1.5">
        <Icon className={cn("h-3.5 w-3.5", color)} />
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      </div>
      <p className={cn("text-lg font-bold font-mono tabular-nums leading-tight", color)}>
        {value}
      </p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}
