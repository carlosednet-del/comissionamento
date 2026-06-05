"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, Loader2, Clock, TrendingUp, CheckCircle2, Wallet, BadgeDollarSign, ExternalLink } from "lucide-react";
import { getCollaboratorStatementAction } from "@/server/actions/dashboardActions";
import type { CollaboratorStatementData, StatementDemand } from "@/server/actions/dashboardActions";
import type { CollaboratorMonthlySummary } from "@/services/dashboardService";
import { WORKER_PROFILE_LABELS } from "@/lib/demand-pricing";
import { cn } from "@/lib/utils";
import type { WorkerProfile } from "@prisma/client";

// ── Formatação ────────────────────────────────────────────────────

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const MONTH_NAMES = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ── Estilos ────────────────────────────────────────────────────────

const ROLE_COLOR: Record<string, string> = {
  DEV:       "text-violet-600 bg-violet-50 border-violet-200",
  SUPORTE:   "text-teal-600   bg-teal-50   border-teal-200",
  ARQUITETO: "text-rose-600   bg-rose-50   border-rose-200",
  GESTOR:    "text-sky-600    bg-sky-50    border-sky-200",
};
const ROLE_LABEL: Record<string, string> = {
  DEV:       "Dev",
  SUPORTE:   "Suporte",
  ARQUITETO: "Arquiteto",
  GESTOR:    "Gestor",
};

const PROFILE_STYLE: Record<WorkerProfile, string> = {
  JUNIOR:       "bg-slate-100  text-slate-700  border-slate-200",
  PLENO:        "bg-blue-50    text-blue-700   border-blue-200",
  SENIOR:       "bg-violet-50  text-violet-700 border-violet-200",
  ESPECIALISTA: "bg-amber-50   text-amber-700  border-amber-200",
};

// ── Linha de demanda ───────────────────────────────────────────────

function DemandRow({
  d,
  dateLabel,
  dateValue,
  valueColor,
}: {
  d:          StatementDemand;
  dateLabel:  string;
  dateValue:  string | null;
  valueColor: string;
}) {
  return (
    <tr className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
      <td className="py-2.5 pl-3 pr-2">
        <a
          href={`/demandas/${d.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-start gap-1.5"
        >
          <span className="text-sm font-medium text-foreground group-hover:text-brand-primary group-hover:underline leading-snug">
            {d.title}
          </span>
          <ExternalLink className="h-3 w-3 mt-0.5 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" />
        </a>
        <span className="text-[10px] text-muted-foreground mt-0.5">
          {dateLabel}: {fmtDate(dateValue)}
        </span>
      </td>
      <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground text-sm whitespace-nowrap">
        {d.estimatedHours != null && d.estimatedHours > 0 ? (
          <span className="flex items-center justify-end gap-1">
            <Clock className="h-3 w-3" />
            {d.estimatedHours.toFixed(1)}h
          </span>
        ) : <span className="opacity-40">—</span>}
      </td>
      <td className="py-2.5 pl-3 pr-4 text-right tabular-nums whitespace-nowrap">
        {d.estimatedDemandValue != null && d.estimatedDemandValue > 0 ? (
          <span className={cn("font-mono font-semibold text-sm", valueColor)}>
            {BRL.format(d.estimatedDemandValue)}
          </span>
        ) : <span className="text-muted-foreground/40 text-xs">—</span>}
      </td>
    </tr>
  );
}

// ── Seção de demandas ──────────────────────────────────────────────

function DemandSection({
  title,
  icon: Icon,
  demands,
  total,
  totalHours,
  dateLabel,
  dateKey,
  valueColor,
  headerColor,
}: {
  title:       string;
  icon:        React.ElementType;
  demands:     StatementDemand[];
  total:       number;
  totalHours:  number;
  dateLabel:   string;
  dateKey:     keyof StatementDemand;
  valueColor:  string;
  headerColor: string;
}) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className={cn("flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide", headerColor)}>
        <span className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5" />
          {title} ({demands.length})
        </span>
        <span className="flex items-center gap-3 font-mono normal-case">
          {totalHours > 0 && (
            <span className="flex items-center gap-1 text-muted-foreground font-normal">
              <Clock className="h-3 w-3" />{totalHours.toFixed(1)}h
            </span>
          )}
          <span className={valueColor}>{BRL.format(total)}</span>
        </span>
      </div>

      {demands.length === 0 ? (
        <p className="text-xs text-muted-foreground px-3 py-4 text-center italic">
          Nenhuma demanda neste período
        </p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="bg-muted/20 border-b">
              <th className="py-1.5 pl-3 pr-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Demanda
              </th>
              <th className="py-1.5 px-3 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Horas
              </th>
              <th className="py-1.5 pl-3 pr-4 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Valor
              </th>
            </tr>
          </thead>
          <tbody>
            {demands.map((d) => (
              <DemandRow
                key={d.id}
                d={d}
                dateLabel={dateLabel}
                dateValue={d[dateKey] as string | null}
                valueColor={valueColor}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Linha de resumo financeiro ─────────────────────────────────────

function FinancialRow({
  label,
  value,
  valueClass = "",
  border = false,
  highlight = false,
}: {
  label:       string;
  value:       string;
  valueClass?: string;
  border?:     boolean;
  highlight?:  boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-2.5 text-sm",
        border    && "border-t",
        highlight && "bg-violet-50 rounded-lg",
      )}
    >
      <span className={cn("text-muted-foreground", highlight && "font-semibold text-foreground")}>
        {label}
      </span>
      <span className={cn("font-mono tabular-nums", highlight ? "font-bold text-base" : "font-medium", valueClass)}>
        {value}
      </span>
    </div>
  );
}

// ── Props ──────────────────────────────────────────────────────────

type Props = {
  c:     CollaboratorMonthlySummary;
  month: number;
  year:  number;
};

// ── Componente ─────────────────────────────────────────────────────

export function CollaboratorStatementModal({ c, month, year }: Props) {
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [data,    setData]    = useState<CollaboratorStatementData | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  async function handleOpen() {
    setOpen(true);
    if (data) return; // já carregado
    setLoading(true);
    setError(null);
    const result = await getCollaboratorStatementAction(c.assigneeId, month, year);
    setLoading(false);
    if (!result.success) { setError(result.error); return; }
    setData(result.data);
  }

  const roleColorClass  = ROLE_COLOR[c.assigneeRole]  ?? "text-muted-foreground bg-muted border-border";
  const profileLabel    = c.assigneeProfile ? WORKER_PROFILE_LABELS[c.assigneeProfile] : null;
  const profileStyle    = c.assigneeProfile ? PROFILE_STYLE[c.assigneeProfile] : "";

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-brand-primary hover:bg-brand-bg-light"
        onClick={handleOpen}
        title={`Extrato de ${c.assigneeName}`}
      >
        <Eye className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            {/* Cabeçalho estilo extrato */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <DialogTitle className="text-xl font-bold leading-tight">
                  {c.assigneeName}
                </DialogTitle>
                <DialogDescription asChild>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={cn(
                      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                      roleColorClass,
                    )}>
                      {ROLE_LABEL[c.assigneeRole] ?? c.assigneeRole}
                    </span>
                    {profileLabel && (
                      <span className={cn(
                        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                        profileStyle,
                      )}>
                        {profileLabel}
                      </span>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {MONTH_NAMES[month]} / {year}
                    </span>
                  </div>
                </DialogDescription>
              </div>

              {/* Valor a pagar em destaque */}
              <div className="shrink-0 text-right">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">A pagar</p>
                {c.payableValue > 0 ? (
                  <p className="text-2xl font-bold font-mono text-violet-700 tabular-nums">
                    {BRL.format(c.payableValue)}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic mt-1">coberto pelo mínimo</p>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 mt-2">

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Conteúdo */}
            {data && !loading && (
              <>
                {/* Demandas aprovadas */}
                <DemandSection
                  title="Aprovadas no período"
                  icon={TrendingUp}
                  demands={data.approvedDemands}
                  total={c.estimatedValue}
                  totalHours={c.approvedHours}
                  dateLabel="Aprovada em"
                  dateKey="approvedAt"
                  valueColor="text-emerald-700"
                  headerColor="bg-emerald-50 text-emerald-800 border-b"
                />

                {/* Demandas homologadas */}
                <DemandSection
                  title="Homologadas no período"
                  icon={CheckCircle2}
                  demands={data.homologatedDemands}
                  total={c.finalValue}
                  totalHours={c.homologatedHours}
                  dateLabel="Homologada em"
                  dateKey="homologationDate"
                  valueColor="text-green-700"
                  headerColor="bg-green-50 text-green-800 border-b"
                />

                {/* Resumo financeiro — estilo extrato bancário */}
                <div className="rounded-lg border overflow-hidden">
                  <div className="bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b flex items-center gap-1.5">
                    <Wallet className="h-3.5 w-3.5" />
                    Resumo financeiro
                  </div>

                  <div className="divide-y">
                    <FinancialRow
                      label="Valor final homologado"
                      value={BRL.format(c.finalValue)}
                      valueClass="text-green-700"
                    />

                    {c.monthlyCap !== null && (
                      <FinancialRow
                        label={`Teto mensal${c.capReached ? " (atingido ⚠)" : ""}`}
                        value={BRL.format(c.monthlyCap)}
                        valueClass={c.capReached ? "text-amber-600" : "text-muted-foreground"}
                      />
                    )}

                    {c.baseSalary > 0 && (
                      <FinancialRow
                        label="(−) Mínimo garantido"
                        value={`− ${BRL.format(c.baseSalary)}`}
                        valueClass="text-slate-600"
                      />
                    )}

                    <div className="px-4 py-1">
                      <div className="border-t border-dashed" />
                    </div>

                    <FinancialRow
                      label={c.payableValue > 0 ? "A pagar (excedente)" : "A pagar"}
                      value={
                        c.payableValue > 0
                          ? BRL.format(c.payableValue)
                          : c.finalValue > 0 && c.baseSalary >= c.finalValue
                            ? "Coberto pelo mínimo garantido"
                            : BRL.format(0)
                      }
                      valueClass={c.payableValue > 0 ? "text-violet-700" : "text-muted-foreground italic"}
                      highlight={c.payableValue > 0}
                      border
                    />
                  </div>

                  {/* Rodapé informativo */}
                  <div className="bg-muted/20 px-4 py-2.5 border-t flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <BadgeDollarSign className="h-3 w-3 shrink-0" />
                    Valor a pagar = max(0, min(final − mínimo, teto − mínimo)).
                    Deflator por atraso e fechamento de RV ainda não implementados.
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
