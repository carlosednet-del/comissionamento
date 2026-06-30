"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  getDapClosingPreviewAction,
  exportDapPeriodVariablesAction,
} from "@/server/actions/dapClosingActions";
import { DapSummaryCards } from "./DapSummaryCards";
import { DapDevTable }     from "./DapDevTable";
import { Card, CardContent } from "@/components/ui/card";
import { Button }   from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  ClipboardList, Search, Download, Clock, AlertCircle, FilterX,
} from "lucide-react";
import type { DapClosingPreview, DapClosingFilters } from "@/types";

// ── Constants ─────────────────────────────────────────────────────

const MONTH_NAMES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

const WORKER_PROFILES = ["JUNIOR","PLENO","SENIOR","ESPECIALISTA"];
const DEMAND_TYPES    = ["NOVA_SOLUCAO","EVOLUCAO_PRODUCAO","CORRECAO","AUTOMACAO","DASHBOARD","INTEGRACAO","OUTRO"];
const COMPLEXITIES    = ["BAIXA","MEDIA","ALTA","CRITICA"];
const ROI_LEVELS      = ["BAIXO","MEDIO","ALTO","ESTRATEGICO"];
const STMT_STATUSES   = [
  { value: "SIGNED",   label: "Assinado"  },
  { value: "EXPORTED", label: "Exportado" },
  { value: "PENDING",  label: "Pendente"  },
  { value: "CANCELED", label: "Cancelado" },
  { value: "NONE",     label: "Sem extrato" },
];

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Props ─────────────────────────────────────────────────────────

type Props = {
  initialData:  DapClosingPreview;
  initialMonth: number;
  initialYear:  number;
};

// ── Component ─────────────────────────────────────────────────────

export function DapClosingView({ initialData, initialMonth, initialYear }: Props) {
  const router = useRouter();

  const [month,   setMonth]   = useState(initialMonth);
  const [year,    setYear]    = useState(initialYear);
  const [data,    setData]    = useState<DapClosingPreview>(initialData);
  const [filters, setFilters] = useState<DapClosingFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  const [isQuerying,  startQuery]  = useTransition();
  const [isExporting, startExport] = useTransition();

  const MM = String(month).padStart(2, "0");

  const query = useCallback(() => {
    startQuery(async () => {
      const result = await getDapClosingPreviewAction(month, year, filters);
      if (!result.success) { toast.error(result.error); return; }
      setData(result.data);
      router.replace(`/fechamento-dap?month=${month}&year=${year}`, { scroll: false });
    });
  }, [month, year, filters, router]);

  function handleExport() {
    startExport(async () => {
      const result = await exportDapPeriodVariablesAction(month, year, filters);
      if (!result.success) { toast.error(result.error); return; }
      downloadCsv(result.data.content, result.data.filename);
      toast.success(`Arquivo gerado: ${result.data.filename}`);
    });
  }

  function clearFilters() {
    setFilters({});
  }

  const hasFilters = Object.values(filters).some((v) => v !== undefined && v !== "");
  const hasPending = data.pendingCount > 0;
  const hasData    = data.totalDemands > 0;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* ── Cabeçalho ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-text-dark">Fechamento DAP</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Consulte e exporte as variáveis do período para processamento.
          </p>
        </div>

        {hasData && (
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="gap-2"
          >
            {isExporting
              ? <><Clock className="h-4 w-4 animate-spin" /> Gerando CSV…</>
              : <><Download className="h-4 w-4" /> Exportar variáveis</>
            }
          </Button>
        )}
      </div>

      {/* ── Filtros ───────────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-4 pb-4 space-y-3">
          {/* Linha principal: mês, ano, consultar */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mês</label>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((name, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {String(i + 1).padStart(2, "0")} — {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ano</label>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEAR_OPTIONS.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={query} disabled={isQuerying} className="gap-2">
              {isQuerying
                ? <><Clock className="h-4 w-4 animate-spin" /> Consultando…</>
                : <><Search className="h-4 w-4" /> Consultar período</>
              }
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters((v) => !v)}
              className={showFilters ? "border-brand-primary text-brand-primary" : ""}
            >
              Filtros avançados {showFilters ? "▲" : "▼"}
            </Button>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
                <FilterX className="h-3.5 w-3.5" /> Limpar filtros
              </Button>
            )}
          </div>

          {/* Filtros avançados */}
          {showFilters && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {/* Status da assinatura */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status assinatura</label>
                  <Select
                    value={filters.statementStatus ?? ""}
                    onValueChange={(v) => setFilters((f) => ({ ...f, statementStatus: v ? v as DapClosingFilters["statementStatus"] : undefined }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      {STMT_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Perfil do dev */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Perfil dev</label>
                  <Select
                    value={filters.workerProfile ?? ""}
                    onValueChange={(v) => setFilters((f) => ({ ...f, workerProfile: v || undefined }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      {WORKER_PROFILES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tipo de demanda */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo de demanda</label>
                  <Select
                    value={filters.demandType ?? ""}
                    onValueChange={(v) => setFilters((f) => ({ ...f, demandType: v || undefined }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      {DEMAND_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g," ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Complexidade */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Complexidade</label>
                  <Select
                    value={filters.complexity ?? ""}
                    onValueChange={(v) => setFilters((f) => ({ ...f, complexity: v || undefined }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas</SelectItem>
                      {COMPLEXITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* ROI */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">ROI</label>
                  <Select
                    value={filters.roi ?? ""}
                    onValueChange={(v) => setFilters((f) => ({ ...f, roi: v || undefined }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      {ROI_LEVELS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Empty state ───────────────────────────────────────────── */}
      {!hasData && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-base font-medium text-muted-foreground">
              Nenhuma demanda homologada encontrada para {MM}/{year}.
            </p>
            <p className="text-sm text-muted-foreground/70">
              Selecione um mês e ano e clique em <strong>Consultar período</strong>.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Conteúdo ──────────────────────────────────────────────── */}
      {hasData && (
        <>
          {/* Alert de pendências */}
          {hasPending && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">
                Extratos pendentes de assinatura
              </AlertTitle>
              <AlertDescription className="text-amber-700">
                Existem <strong>{data.pendingCount}</strong> extrato
                {data.pendingCount !== 1 ? "s" : ""} pendente{data.pendingCount !== 1 ? "s" : ""} de
                assinatura neste período. A exportação pode ser realizada, mas os registros pendentes
                serão identificados no arquivo como <strong>PENDING</strong>.
              </AlertDescription>
            </Alert>
          )}

          {/* Cards de resumo */}
          <DapSummaryCards preview={data} />

          {/* Tabela de devs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-brand-text-dark">
                Desenvolvedores — {MM}/{year}
                {hasFilters && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">(filtrado)</span>
                )}
              </h2>
              <span className="text-xs text-muted-foreground">{data.totalDevs} dev{data.totalDevs !== 1 ? "s" : ""}</span>
            </div>

            <DapDevTable developers={data.developers} />
          </div>

          {/* Botão de exportação duplicado no rodapé */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleExport}
              disabled={isExporting}
              variant="outline"
              className="gap-2 border-brand-primary text-brand-primary hover:bg-brand-primary/5"
            >
              {isExporting
                ? <><Clock className="h-4 w-4 animate-spin" /> Gerando CSV…</>
                : <><Download className="h-4 w-4" /> Exportar variáveis ({data.totalDemands} demandas)</>
              }
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
