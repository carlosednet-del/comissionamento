"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getMyStatementAction, exportMyStatementAction, registerPdfExportAction } from "@/server/actions/statementActions";
import { SignStatementDialog } from "./SignStatementDialog";
import { StatementStatusBadge } from "./StatementStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ClipboardList, Clock, DollarSign, BadgeCheck,
  Download, Search, Info, ShieldCheck, Copy, CalendarClock, Lock, FileText,
} from "lucide-react";
import type { StatementData } from "@/types";
import type { UserForPermission } from "@/server/auth/permissions";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const DATE_FMT = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
const DATETIME_FMT = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" });

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : DATE_FMT.format(d);
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Props ─────────────────────────────────────────────────────────

type Props = {
  actor:        UserForPermission;
  initialData:  StatementData;
  initialMonth: number;
  initialYear:  number;
};

// ── Componente principal ──────────────────────────────────────────

export function StatementView({ actor, initialData, initialMonth, initialYear }: Props) {
  const router = useRouter();

  const [month, setMonth] = useState(initialMonth);
  const [year,  setYear]  = useState(initialYear);
  const [data,  setData]  = useState<StatementData>(initialData);

  const [isQuerying, startQuery]      = useTransition();
  const [isExporting, startExport]    = useTransition();
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const isOwnExtrato    = actor.role === "DEV" && actor.id === data.developer.id;
  const windowIsOpen    = data.signingWindow.isOpen;
  const canSign         = isOwnExtrato && windowIsOpen && (!data.statement || data.statement.status === "PENDING");

  // Reconsulta via action (sem reload de página)
  const query = useCallback(() => {
    startQuery(async () => {
      const result = await getMyStatementAction(month, year);
      if (!result.success) { toast.error(result.error); return; }
      setData(result.data);
      router.replace(`/meu-extrato?month=${month}&year=${year}`, { scroll: false });
    });
  }, [month, year, router]);

  function handleExport() {
    if (!data.statement?.id) return;
    startExport(async () => {
      const result = await exportMyStatementAction(data.statement!.id);
      if (!result.success) { toast.error(result.error); return; }
      downloadCsv(result.data.content, result.data.filename);
      // Atualiza status para EXPORTED
      setData((prev) => ({
        ...prev,
        statement: prev.statement ? { ...prev.statement, status: "EXPORTED" } : null,
      }));
      toast.success("Extrato exportado com sucesso.");
    });
  }

  async function handleExportPdf() {
    if (!data.statement?.id) return;
    setIsExportingPdf(true);
    try {
      // Registra no servidor antes de gerar: se não houver permissão, nada é baixado.
      const result = await registerPdfExportAction(data.statement.id);
      if (!result.success) { toast.error(result.error); return; }

      // Import dinâmico: mantém o jsPDF fora do bundle inicial da página.
      const { generateStatementPdf } = await import("@/lib/statement/generateStatementPdf");
      generateStatementPdf(data);

      setData((prev) => ({
        ...prev,
        statement: prev.statement ? { ...prev.statement, status: "EXPORTED" } : null,
      }));
      toast.success("Extrato exportado em PDF.");
    } catch {
      toast.error("Falha ao gerar o PDF. Tente novamente.");
    } finally {
      setIsExportingPdf(false);
    }
  }

  function handleSigned() {
    // Após assinar: reconsulta para pegar os dados da assinatura
    startQuery(async () => {
      const result = await getMyStatementAction(month, year);
      if (result.success) setData(result.data);
    });
  }

  const MM = String(month).padStart(2, "0");

  const fmtShort = (iso: string) =>
    DATE_FMT.format(new Date(iso));

  const windowOpen  = fmtShort(data.signingWindow.open);
  const windowClose = fmtShort(data.signingWindow.close);
  const periodLabel = `${fmtShort(data.periodStart)} a ${fmtShort(data.periodEnd)}`;

  const now = new Date();
  const windowStart = new Date(data.signingWindow.open);
  const windowPending = now < windowStart;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {/* ── Cabeçalho ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-text-dark">Meu Extrato</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Período: <strong>{periodLabel}</strong> · Assinatura: {windowOpen} a {windowClose}
          </p>
        </div>
        {data.statement && (
          <StatementStatusBadge status={data.statement.status} />
        )}
      </div>

      {/* ── Filtros ───────────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mês</label>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger className="w-40">
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
                : <><Search className="h-4 w-4" /> Consultar</>
              }
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Dev info (ADMIN/DIRETOR) ──────────────────────────────── */}
      {actor.role !== "DEV" && (
        <Alert className="border-indigo-200 bg-indigo-50">
          <Info className="h-4 w-4 text-indigo-600" />
          <AlertTitle className="text-indigo-800">Modo de consulta</AlertTitle>
          <AlertDescription className="text-indigo-700">
            Você está visualizando o extrato de <strong>{data.developer.name}</strong> como{" "}
            {actor.role}. ADMIN e DIRETOR não podem assinar no lugar do DEV.
          </AlertDescription>
        </Alert>
      )}

      {/* ── Empty state ───────────────────────────────────────────── */}
      {data.items.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-base font-medium text-muted-foreground">
              Nenhuma demanda homologada encontrada para {MM}/{year}.
            </p>
            <p className="text-sm text-muted-foreground/70">
              Apenas demandas com <strong>data de entrega real</strong> no período selecionado são consideradas.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Conteúdo quando há demandas ───────────────────────────── */}
      {data.items.length > 0 && (
        <>
          {/* ── Cards de resumo ──────────────────────────────────── */}
          {(() => {
            const total    = data.totals.totalEstimatedValue;
            const minimo   = data.developer.monthlyBaseSalary ?? 0;
            const aPagar   = Math.max(0, total - minimo);
            return (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                <Card className="border-blue-200 bg-blue-50/60">
                  <CardHeader className="pb-1 pt-3 px-4">
                    <CardTitle className="text-xs font-medium text-blue-600 flex items-center gap-1.5">
                      <ClipboardList className="h-3.5 w-3.5" />
                      Demandas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3 px-4">
                    <p className="text-2xl font-bold text-blue-700">{data.totals.totalDemands}</p>
                  </CardContent>
                </Card>

                <Card className="border-violet-200 bg-violet-50/60">
                  <CardHeader className="pb-1 pt-3 px-4">
                    <CardTitle className="text-xs font-medium text-violet-600 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Total de horas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3 px-4">
                    <p className="text-2xl font-bold text-violet-700">{data.totals.totalEstimatedHours}h</p>
                  </CardContent>
                </Card>

                <Card className="border-emerald-200 bg-emerald-50/60">
                  <CardHeader className="pb-1 pt-3 px-4">
                    <CardTitle className="text-xs font-medium text-emerald-600 flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5" />
                      Valor total
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3 px-4">
                    <p className="text-sm font-bold text-emerald-700 font-mono">{BRL.format(total)}</p>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 bg-slate-50/60">
                  <CardHeader className="pb-1 pt-3 px-4">
                    <CardTitle className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5" />
                      Mínimo garantido
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3 px-4">
                    <p className="text-sm font-bold text-slate-700 font-mono">
                      {data.developer.monthlyBaseSalary !== null ? BRL.format(data.developer.monthlyBaseSalary) : "—"}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-teal-200 bg-teal-50/60">
                  <CardHeader className="pb-1 pt-3 px-4">
                    <CardTitle className="text-xs font-medium text-teal-600 flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5" />
                      Valor a pagar
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3 px-4">
                    <p className="text-sm font-bold text-teal-700 font-mono">{BRL.format(aPagar)}</p>
                  </CardContent>
                </Card>

                <Card className={data.statement?.status === "SIGNED" || data.statement?.status === "EXPORTED"
                  ? "border-emerald-200 bg-emerald-50/60"
                  : "border-amber-200 bg-amber-50/60"}>
                  <CardHeader className="pb-1 pt-3 px-4">
                    <CardTitle className={`text-xs font-medium flex items-center gap-1.5 ${
                      data.statement?.status === "SIGNED" || data.statement?.status === "EXPORTED"
                        ? "text-emerald-600" : "text-amber-600"
                    }`}>
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3 px-4">
                    <StatementStatusBadge status={data.statement?.status ?? "PENDING"} />
                  </CardContent>
                </Card>
              </div>
            );
          })()}

          {/* ── Tabela de demandas ─────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-brand-primary" />
                Demandas do período — {MM}/{year}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">ID</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Área</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Complexidade</TableHead>
                      <TableHead>ROI</TableHead>
                      <TableHead className="text-right">Horas</TableHead>
                      <TableHead className="text-right">Valor/h</TableHead>
                      <TableHead className="text-right">Valor estimado</TableHead>
                      <TableHead>Entrega</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((item) => (
                      <TableRow key={item.demandId}>
                        <TableCell className="font-mono text-xs">{item.demandCode}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={item.demandTitle}>
                          {item.demandTitle}
                        </TableCell>
                        <TableCell className="text-xs">{item.requesterArea ?? "—"}</TableCell>
                        <TableCell className="text-xs">{item.demandType ?? "—"}</TableCell>
                        <TableCell className="text-xs">{item.complexity ?? "—"}</TableCell>
                        <TableCell className="text-xs">{item.roi ?? "—"}</TableCell>
                        <TableCell className="text-right font-mono">{item.estimatedHours}h</TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {item.hourlyRate !== null ? BRL.format(item.hourlyRate) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {BRL.format(item.estimatedValue)}
                        </TableCell>
                        <TableCell className="text-xs">{fmtDate(item.deliveryDate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Totais */}
              <Separator className="my-3" />
              <div className="flex flex-wrap justify-end gap-6 text-sm font-semibold text-brand-text-dark px-1">
                <span>{data.totals.totalDemands} demanda{data.totals.totalDemands !== 1 ? "s" : ""}</span>
                <span>{data.totals.totalEstimatedHours}h estimadas</span>
                <span className="font-mono text-emerald-700">{BRL.format(data.totals.totalEstimatedValue)}</span>
              </div>
            </CardContent>
          </Card>

          {/* ── Ação: assinar (PENDING + janela aberta) ────────────── */}
          {canSign && (
            <Alert className="border-amber-200 bg-amber-50">
              <Info className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">Extrato pendente de assinatura</AlertTitle>
              <AlertDescription className="text-amber-700 mt-2 space-y-3">
                <p>Confira as demandas e valores antes de assinar. Após a assinatura, o extrato não poderá mais ser alterado.</p>
                <p className="text-xs flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                  Prazo de assinatura: <strong>{windowOpen}</strong> até <strong>{windowClose}</strong>
                </p>
                <SignStatementDialog month={month} year={year} onSigned={handleSigned} />
              </AlertDescription>
            </Alert>
          )}

          {/* Janela ainda não aberta */}
          {isOwnExtrato && windowPending && (!data.statement || data.statement.status === "PENDING") && (
            <Alert className="border-blue-200 bg-blue-50">
              <CalendarClock className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800">Assinatura disponível a partir de {windowOpen}</AlertTitle>
              <AlertDescription className="text-blue-700">
                O período de demandas ainda não encerrou. A janela de assinatura abre em{" "}
                <strong>{windowOpen}</strong> e fecha em <strong>{windowClose}</strong>.
              </AlertDescription>
            </Alert>
          )}

          {/* Janela expirada */}
          {isOwnExtrato && !windowIsOpen && !windowPending && (!data.statement || data.statement.status === "PENDING") && (
            <Alert className="border-red-200 bg-red-50">
              <Lock className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-red-800">Prazo de assinatura encerrado</AlertTitle>
              <AlertDescription className="text-red-700">
                A janela de assinatura para {MM}/{year} encerrou em <strong>{windowClose}</strong>.
                Não é mais possível assinar este extrato.
              </AlertDescription>
            </Alert>
          )}

          {/* ── Card de assinatura (SIGNED/EXPORTED) ──────────────── */}
          {(data.statement?.status === "SIGNED" || data.statement?.status === "EXPORTED") && data.statement && (
            <Card className="border-emerald-200 bg-emerald-50/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-emerald-800">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Extrato assinado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Código de assinatura</dt>
                    <dd className="flex items-center gap-2 font-mono text-sm font-bold text-emerald-800 break-all">
                      {data.statement.signatureCode}
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(data.statement!.signatureCode ?? "");
                          toast.info("Código copiado.");
                        }}
                        className="text-muted-foreground hover:text-emerald-700 shrink-0"
                        title="Copiar código"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Assinado em</dt>
                    <dd className="text-sm">{data.statement.signedAt ? DATETIME_FMT.format(new Date(data.statement.signedAt)) : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">IP da assinatura</dt>
                    <dd className="text-sm font-mono">{data.statement.signatureIp ?? "—"}</dd>
                  </div>
                  {data.statement.contentHash && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Hash do conteúdo (SHA-256)</dt>
                      <dd className="font-mono text-xs break-all text-muted-foreground">{data.statement.contentHash}</dd>
                    </div>
                  )}
                </dl>

                <Separator className="my-4" />

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    onClick={handleExportPdf}
                    disabled={isExportingPdf || isExporting}
                    className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    {isExportingPdf
                      ? <><Clock className="h-4 w-4 animate-spin" /> Gerando PDF…</>
                      : <><FileText className="h-4 w-4" /> Exportar extrato assinado (.pdf)</>
                    }
                  </Button>

                  <Button
                    onClick={handleExport}
                    disabled={isExporting || isExportingPdf}
                    variant="outline"
                    className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  >
                    {isExporting
                      ? <><Clock className="h-4 w-4 animate-spin" /> Exportando…</>
                      : <><Download className="h-4 w-4" /> Exportar (.csv)</>
                    }
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
