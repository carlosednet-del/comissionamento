/**
 * MonthlySummaryTable — Tabela de resultados financeiros por colaborador
 *
 * Mostra, para o período selecionado:
 *  · Valor estimado = SUM(estimatedDemandValue) das demandas aprovadas no mês
 *  · Valor final    = SUM(estimatedDemandValue) das demandas homologadas no mês
 *  · Valor previsto = SUM(estimatedDemandValue) de TODAS as demandas (carteira total)
 *
 * ⚠  Deflator por atraso e fechamento de RV/comissão NÃO implementados.
 *    Todos os valores são informativos.
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
  LayoutList,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
} from "lucide-react";

// ── Formatação ────────────────────────────────────────────────────

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const NUM = new Intl.NumberFormat("pt-BR");

const MONTH_NAMES = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// ── Estilos por papel (role) ──────────────────────────────────────

const ROLE_COLOR: Record<string, string> = {
  DEV:        "text-violet-600",
  SUPORTE:    "text-teal-600",
  ARQUITETO:  "text-rose-600",
};

const ROLE_LABEL: Record<string, string> = {
  DEV:        "Dev",
  SUPORTE:    "Suporte",
  ARQUITETO:  "Arquiteto",
};

// ── Estilos por perfil ────────────────────────────────────────────

const PROFILE_STYLE: Record<WorkerProfile, string> = {
  JUNIOR:       "bg-slate-100  text-slate-700  border-slate-200",
  PLENO:        "bg-blue-50    text-blue-700   border-blue-200",
  SENIOR:       "bg-violet-50  text-violet-700 border-violet-200",
  ESPECIALISTA: "bg-amber-50   text-amber-700  border-amber-200",
};

// ── Props ─────────────────────────────────────────────────────────

type Props = {
  data:     MonthlyDashboardSummary;
  sortBy:   string;
  sortDir:  string;
};

// ── Ícone de sort para cabeçalho ──────────────────────────────────

function SortIcon({ col, sortBy, sortDir }: { col: string; sortBy: string; sortDir: string }) {
  if (sortBy !== col) {
    return <ArrowUpDown className="inline-block h-3 w-3 ml-0.5 opacity-30" />;
  }
  return sortDir === "asc"
    ? <ArrowUp   className="inline-block h-3 w-3 ml-0.5 opacity-80" />
    : <ArrowDown className="inline-block h-3 w-3 ml-0.5 opacity-80" />;
}

// ── Componente principal ──────────────────────────────────────────

export function MonthlySummaryTable({ data, sortBy, sortDir }: Props) {
  const { month, year, collaborators, totals } = data;
  const monthLabel = `${MONTH_NAMES[month]} / ${year}`;

  // ── Sem dados ──────────────────────────────────────────────────
  if (collaborators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-14 text-center">
        <ClipboardCheck className="h-9 w-9 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">
          Nenhum resultado para o período selecionado
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          {monthLabel} · Ajuste o período ou os filtros acima
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* Aviso informativo */}
      <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
        <InfoIcon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>
          Valores informativos.{" "}
          <strong>Deflator por atraso</strong> e <strong>fechamento de RV</strong> ainda não implementados.
        </span>
      </div>

      {/* ── Mini-cards de resumo ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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
        <SummaryMini
          label="Carteira total"
          value={NUM.format(totals.portfolioCount)}
          sub="todas as demandas"
          icon={LayoutList}
          color="text-blue-700"
          bg="bg-blue-50 border-blue-100"
        />
        <SummaryMini
          label="Valor previsto"
          value={BRL.format(totals.portfolioValue)}
          sub="carteira total"
          icon={LayoutList}
          color="text-blue-700"
          bg="bg-blue-50 border-blue-100"
        />
      </div>

      {/* ── Tabela por colaborador ───────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border shadow-sm">
        <table className="w-full text-sm">
          <thead>
            {/* Linha 1 — grupos */}
            <tr className="border-b bg-muted/30">
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                rowSpan={2}
              >
                Colaborador
              </th>
              <th
                className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                rowSpan={2}
              >
                Papel / Perfil
              </th>

              {/* Aprovadas */}
              <th
                className="px-3 py-2 text-center text-xs font-semibold text-emerald-700 uppercase tracking-wide border-l border-dashed"
                colSpan={3}
              >
                Aprovadas no período
              </th>

              {/* Homologadas */}
              <th
                className="px-3 py-2 text-center text-xs font-semibold text-green-700 uppercase tracking-wide border-l border-dashed"
                colSpan={4}
              >
                Homologadas no período
              </th>

              {/* Carteira */}
              <th
                className="px-3 py-2 text-center text-xs font-semibold text-blue-700 uppercase tracking-wide border-l border-dashed"
                colSpan={2}
              >
                Carteira total
              </th>
            </tr>

            {/* Linha 2 — colunas de dados */}
            <tr className="border-b bg-muted/20">
              {/* Aprovadas */}
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wide border-l border-dashed">
                Dem.
              </th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Horas
              </th>
              <th className={cn(
                "px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide",
                sortBy === "estimatedValue" ? "text-emerald-700" : "text-muted-foreground",
              )}>
                Valor est. <SortIcon col="estimatedValue" sortBy={sortBy} sortDir={sortDir} />
              </th>

              {/* Homologadas */}
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wide border-l border-dashed">
                Dem.
              </th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Horas
              </th>
              <th className={cn(
                "px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide",
                sortBy === "finalValue" ? "text-green-700" : "text-muted-foreground",
              )}>
                Valor final <SortIcon col="finalValue" sortBy={sortBy} sortDir={sortDir} />
              </th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-amber-600 uppercase tracking-wide">
                Teto mensal
              </th>

              {/* Carteira */}
              <th className={cn(
                "px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide border-l border-dashed",
                sortBy === "approvedCount" ? "text-emerald-700" : "text-muted-foreground",
              )}>
                Dem. <SortIcon col="approvedCount" sortBy={sortBy} sortDir={sortDir} />
              </th>
              <th className={cn(
                "px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide",
                sortBy === "portfolioValue" ? "text-blue-700" : "text-muted-foreground",
              )}>
                Valor prev. <SortIcon col="portfolioValue" sortBy={sortBy} sortDir={sortDir} />
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

                {/* Papel / Perfil */}
                <td className="px-3 py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-wide",
                      ROLE_COLOR[c.assigneeRole] ?? "text-muted-foreground",
                    )}>
                      {ROLE_LABEL[c.assigneeRole] ?? c.assigneeRole}
                    </span>
                    {c.assigneeProfile ? (
                      <span className={cn(
                        "inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                        PROFILE_STYLE[c.assigneeProfile],
                      )}>
                        {WORKER_PROFILE_LABELS[c.assigneeProfile]}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </div>
                </td>

                {/* Aprovadas no período */}
                <td className="px-3 py-3 text-right tabular-nums text-muted-foreground border-l border-dashed">
                  {c.approvedCount > 0
                    ? <span className={cn(sortBy === "approvedCount" && "font-semibold text-emerald-700")}>{c.approvedCount}</span>
                    : <span className="opacity-40">—</span>
                  }
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                  {c.approvedHours > 0
                    ? <span className="flex items-center justify-end gap-1"><Clock className="h-3 w-3" />{c.approvedHours.toFixed(1)}h</span>
                    : <span className="opacity-40">—</span>
                  }
                </td>
                <td className="px-3 py-3 text-right">
                  {c.estimatedValue > 0 ? (
                    <span className={cn(
                      "font-mono font-semibold",
                      sortBy === "estimatedValue" ? "text-emerald-700" : "text-emerald-600",
                    )}>
                      {BRL.format(c.estimatedValue)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/40 text-xs">—</span>
                  )}
                </td>

                {/* Homologadas no período */}
                <td className="px-3 py-3 text-right tabular-nums text-muted-foreground border-l border-dashed">
                  {c.homologatedCount > 0
                    ? c.homologatedCount
                    : <span className="opacity-40">—</span>
                  }
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                  {c.homologatedHours > 0
                    ? <span className="flex items-center justify-end gap-1"><Clock className="h-3 w-3" />{c.homologatedHours.toFixed(1)}h</span>
                    : <span className="opacity-40">—</span>
                  }
                </td>
                <td className="px-3 py-3 text-right">
                  {c.finalValue > 0 ? (
                    <span className={cn(
                      "font-mono font-semibold",
                      sortBy === "finalValue" ? "text-green-700" : "text-green-600",
                    )}>
                      {BRL.format(c.finalValue)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/40 text-xs">—</span>
                  )}
                </td>

                {/* Teto mensal */}
                <td className="px-3 py-3 text-right">
                  {c.monthlyCap !== null ? (
                    <div className="flex flex-col items-end gap-0.5">
                      <span className={cn(
                        "font-mono text-[11px] font-semibold tabular-nums",
                        c.capReached ? "text-amber-600" : "text-muted-foreground/50",
                      )}>
                        {BRL.format(c.monthlyCap)}
                      </span>
                      {c.capReached && (
                        <span className="inline-flex items-center rounded-full bg-amber-100 border border-amber-200 px-1.5 py-px text-[9px] font-bold uppercase text-amber-700 tracking-wide">
                          teto
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="opacity-40 text-xs">—</span>
                  )}
                </td>

                {/* Carteira total */}
                <td className="px-3 py-3 text-right tabular-nums text-muted-foreground border-l border-dashed">
                  {c.portfolioCount > 0
                    ? c.portfolioCount
                    : <span className="opacity-40">—</span>
                  }
                </td>
                <td className="px-3 py-3 text-right">
                  {c.portfolioValue > 0 ? (
                    <span className={cn(
                      "font-mono font-semibold",
                      sortBy === "portfolioValue" ? "text-blue-700" : "text-blue-600",
                    )}>
                      {BRL.format(c.portfolioValue)}
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
              <tr className="border-t-2 bg-muted/40 font-semibold">
                <td
                  className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground"
                  colSpan={2}
                >
                  Total — {collaborators.length} colaborador{collaborators.length !== 1 ? "es" : ""}
                </td>
                {/* Aprovadas */}
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
                  <span className="font-mono text-emerald-700">
                    {BRL.format(totals.estimatedValue)}
                  </span>
                </td>
                {/* Homologadas */}
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
                <td className="px-3 py-3 text-right text-muted-foreground/40 text-xs">—</td>
                {/* Carteira */}
                <td className="px-3 py-3 text-right tabular-nums border-l border-dashed">
                  {totals.portfolioCount}
                </td>
                <td className="px-3 py-3 text-right">
                  <span className="font-mono text-blue-700">
                    {BRL.format(totals.portfolioValue)}
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
