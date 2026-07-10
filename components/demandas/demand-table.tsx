"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { DemandSummary } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteDemandAction } from "@/server/actions/demandActions";
import { StatusBadge } from "./status-badge";
import { PriorityBadge } from "./priority-badge";
import { TypeBadge } from "./type-badge";
import { DirectorBadge } from "./director-badge";
import { Eye, Trash2, ChevronLeft, ChevronRight, TrendingDown, Star } from "lucide-react";
import { calculateBenchmarkEconomy } from "@/lib/benchmark/calculateBenchmarkEconomy";
import type { WorkerProfile } from "@prisma/client";
const DATE_FMT = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
const BRL      = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const PCT      = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 });

type Props = {
  demands:       DemandSummary[];
  total:         number;
  page:          number;
  pageSize:      number;
  totalPages:    number;
  canDelete?:    boolean;
  showBenchmark?: boolean;
};

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return "—";
  return DATE_FMT.format(date);
}

export function DemandTable({ demands, total, page, pageSize, totalPages, canDelete = false, showBenchmark = false }: Props) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [isPending, startTransition]    = useTransition();

  function goPage(p: number) {
    const sp = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    sp.set("page", String(p));
    router.push(`?${sp.toString()}`);
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const { id } = deleteTarget;
    startTransition(async () => {
      const res = await deleteDemandAction(id);
      if (res.success) {
        toast.success("Demanda excluída com sucesso");
        setDeleteTarget(null);
        router.refresh();
      } else {
        toast.error(res.error ?? "Erro ao excluir demanda");
      }
    });
  }

  if (demands.length === 0) {
    return (
      <div className="rounded-lg border bg-card py-16 text-center">
        <p className="text-muted-foreground text-sm">Nenhuma demanda encontrada.</p>
        <p className="text-muted-foreground text-xs mt-1">Tente ajustar os filtros ou crie uma nova demanda.</p>
      </div>
    );
  }

  return (
    <>
    <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v && !isPending) setDeleteTarget(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Excluir demanda
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              <p>
                Você está prestes a excluir <strong className="text-foreground">{deleteTarget?.title}</strong> do sistema.
              </p>
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-destructive">
                <p className="font-semibold">Esta ação é irreversível e irá remover a demanda, suas evidências e todo o histórico de auditoria.</p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); handleDeleteConfirm(); }}
            disabled={isPending}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isPending ? "Excluindo…" : "Sim, excluir permanentemente"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <div className="space-y-3">
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-[30%]">Título</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Entrega prevista</TableHead>
              {showBenchmark && <TableHead className="text-right">Bench ajustado</TableHead>}
              {showBenchmark && <TableHead className="text-right">Economia</TableHead>}
              <TableHead className={canDelete ? "w-20 text-right" : "w-12 text-right"} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {demands.map((d) => (
              <TableRow key={d.id} className="hover:bg-muted/30 transition-colors">
                <TableCell>
                  <div className="font-medium leading-snug line-clamp-2">{d.title}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-muted-foreground">{d.requesterArea}</span>
                    <DirectorBadge requesterArea={d.requesterArea} />
                  </div>
                </TableCell>
                <TableCell>
                  <TypeBadge type={d.demandType} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <PriorityBadge priority={d.priority} showIcon />
                    {d.directorPriorityOrder != null && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        <Star className="h-2.5 w-2.5" />
                        {d.directorPriorityOrder}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={d.status} />
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {d.assignee?.name ?? <span className="text-muted-foreground italic">Sem responsável</span>}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm tabular-nums">
                    {fmtDate(d.plannedDeliveryDate)}
                  </span>
                </TableCell>
                {showBenchmark && (() => {
                  if (!d.estimatedHours || !d.assigneeProfileSnapshot) {
                    return (
                      <>
                        <TableCell className="text-right text-xs text-muted-foreground">—</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">—</TableCell>
                      </>
                    );
                  }
                  const bench = calculateBenchmarkEconomy({
                    estimatedHours: d.estimatedHours,
                    workerProfile:  d.assigneeProfileSnapshot as WorkerProfile,
                    ourHourlyRate:  d.hourlyRateSnapshot ?? undefined,
                    ourValue:       d.estimatedDemandValue ?? undefined,
                  });
                  return (
                    <>
                      <TableCell className="text-right text-xs tabular-nums font-medium">
                        {BRL.format(bench.marketBenchAdjusted)}
                      </TableCell>
                      <TableCell className="text-right">
                        {bench.economy > 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-700">
                            <TrendingDown className="h-3 w-3" />
                            {BRL.format(bench.economy)}
                            <span className="text-emerald-500 text-[10px]">
                              ({PCT.format(bench.economyPercent)})
                            </span>
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </>
                  );
                })()}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                      <Link href={`/demandas/${d.id}`}>
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">Ver demanda</span>
                      </Link>
                    </Button>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteTarget({ id: d.id, title: d.title })}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Excluir demanda</span>
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            Exibindo {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total} demandas
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => goPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => goPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
