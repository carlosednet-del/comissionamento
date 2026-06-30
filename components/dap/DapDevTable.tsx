"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { exportDapDeveloperStatementAction } from "@/server/actions/dapClosingActions";
import { DapStatusBadge } from "./DapStatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ChevronDown, ChevronRight, Download, Copy } from "lucide-react";
import type { DapDeveloperRow } from "@/types";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const DATE_FMT = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
const DT_FMT   = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : DATE_FMT.format(d);
}
function fmtDt(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : DT_FMT.format(d);
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

type DevRowProps = { row: DapDeveloperRow };

function DevCard({ row }: DevRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [isExporting, start]    = useTransition();

  function handleExport() {
    if (!row.statementId) return;
    start(async () => {
      const res = await exportDapDeveloperStatementAction(row.statementId!);
      if (!res.success) { toast.error(res.error); return; }
      downloadCsv(res.data.content, res.data.filename);
      toast.success("Extrato exportado.");
    });
  }

  const isSigned = row.statementStatus === "SIGNED" || row.statementStatus === "EXPORTED";

  return (
    <Card className="overflow-hidden">
      {/* ── Linha resumo do DEV ────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-muted/30">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
        >
          {expanded
            ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          }
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{row.developerName}</p>
            <p className="text-xs text-muted-foreground truncate">{row.developerEmail}</p>
          </div>
        </button>

        <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground shrink-0">
          <span>{row.developerProfile ?? "—"}</span>
          <span className="font-semibold text-brand-text-dark">{row.totalDemands}d</span>
          <span>{row.totalEstimatedHours}h</span>
          <span className="font-mono font-semibold">{BRL.format(row.totalEstimatedValue)}</span>
        </div>

        <div className="shrink-0">
          <DapStatusBadge status={row.statementStatus} />
        </div>

        {isSigned && row.statementId && (
          <Button
            size="sm"
            variant="outline"
            disabled={isExporting}
            onClick={handleExport}
            className="shrink-0 h-7 px-2 text-xs gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          >
            <Download className="h-3 w-3" />
            Extrato
          </Button>
        )}
      </div>

      {/* ── Detalhe do extrato assinado ───────────────────────── */}
      {isSigned && row.signatureCode && (
        <div className="flex flex-wrap gap-4 px-4 py-2 text-xs bg-emerald-50/50 border-b border-emerald-100">
          <span className="flex items-center gap-1 font-medium text-emerald-700">
            Código:
            <code className="font-mono ml-1">{row.signatureCode}</code>
            <button
              onClick={() => { navigator.clipboard.writeText(row.signatureCode!); toast.info("Copiado."); }}
              className="ml-1 text-emerald-600 hover:text-emerald-800"
            >
              <Copy className="h-3 w-3" />
            </button>
          </span>
          {row.signedAt && (
            <span className="text-muted-foreground">Assinado em: {fmtDt(row.signedAt)}</span>
          )}
          {row.signatureIp && (
            <span className="text-muted-foreground font-mono">IP: {row.signatureIp}</span>
          )}
        </div>
      )}

      {/* ── Demandas expandidas ───────────────────────────────── */}
      {expanded && (
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20">
                  <TableHead className="w-20">ID</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Complexidade</TableHead>
                  <TableHead>ROI</TableHead>
                  <TableHead className="text-right">Horas</TableHead>
                  <TableHead className="text-right">Valor/h</TableHead>
                  <TableHead className="text-right">Valor est.</TableHead>
                  <TableHead>Homologação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {row.demands.map((d) => (
                  <TableRow key={d.demandId}>
                    <TableCell className="font-mono text-xs">{d.demandCode}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm" title={d.demandTitle}>
                      {d.demandTitle}
                    </TableCell>
                    <TableCell className="text-xs">{d.requesterArea ?? "—"}</TableCell>
                    <TableCell className="text-xs">{d.demandType ?? "—"}</TableCell>
                    <TableCell className="text-xs">{d.complexity ?? "—"}</TableCell>
                    <TableCell className="text-xs">{d.roi ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{d.estimatedHours}h</TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {d.hourlyRate !== null ? BRL.format(d.hourlyRate) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-xs">
                      {BRL.format(d.estimatedValue)}
                    </TableCell>
                    <TableCell className="text-xs">{fmtDate(d.homologationDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Separator />
          <div className="flex justify-end gap-6 px-4 py-2 text-xs font-semibold text-muted-foreground">
            <span>{row.totalDemands} demanda{row.totalDemands !== 1 ? "s" : ""}</span>
            <span>{row.totalEstimatedHours}h</span>
            <span className="font-mono text-emerald-700">{BRL.format(row.totalEstimatedValue)}</span>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

type Props = { developers: DapDeveloperRow[] };

export function DapDevTable({ developers }: Props) {
  if (developers.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Cabeçalho da lista */}
      <div className="hidden md:flex items-center gap-3 px-4 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        <div className="flex-1 pl-6">Desenvolvedor</div>
        <div className="w-20 text-right">Demandas</div>
        <div className="w-16 text-right">Horas</div>
        <div className="w-28 text-right">Valor est.</div>
        <div className="w-28 text-right pr-2">Assinatura</div>
        <div className="w-24" />
      </div>

      {developers.map((row) => (
        <DevCard key={row.developerId} row={row} />
      ))}
    </div>
  );
}
