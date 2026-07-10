"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Check, X, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  updateBenchmarkRateAction,
  resetBenchmarkRateAction,
  updateBenchmarkAcceleratorAction,
  resetBenchmarkAcceleratorAction,
} from "@/server/actions/benchmarkConfigActions";
import type { BenchmarkRateRow, BenchmarkAcceleratorRow } from "@/services/benchmarkConfigService";
import { DEVELOPER_BENCHMARK_HOURLY_RATES, TEAM_ACCELERATOR } from "@/lib/benchmark/benchmarkRates";
import type { WorkerProfile } from "@prisma/client";

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
}

// ── Linha de taxa por perfil ──────────────────────────────────────────────────

function RateRow({ row, onUpdated }: { row: BenchmarkRateRow; onUpdated: (r: BenchmarkRateRow) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue]     = useState("");
  const [isPending, start]    = useTransition();
  const defaultRate           = DEVELOPER_BENCHMARK_HOURLY_RATES[row.profile as WorkerProfile];

  function handleSave() {
    const marketRate = parseFloat(value.replace(",", "."));
    if (isNaN(marketRate) || marketRate <= 0) { toast.error("Taxa inválida"); return; }
    start(async () => {
      const res = await updateBenchmarkRateAction({ profile: row.profile, marketRate });
      if (res.success) { onUpdated(res.data); setEditing(false); toast.success(`${row.label} atualizado`); }
      else toast.error(res.error);
    });
  }

  function handleReset() {
    start(async () => {
      const res = await resetBenchmarkRateAction(row.profile as WorkerProfile);
      if (res.success) {
        onUpdated({ ...row, marketRate: defaultRate, isCustomized: false });
        toast.success(`${row.label} restaurado para o padrão`);
      } else toast.error(res.error);
    });
  }

  return (
    <TableRow className={row.isCustomized ? "bg-amber-50/40 dark:bg-amber-950/10" : undefined}>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          {row.label}
          {row.isCustomized && (
            <Badge variant="outline" className="text-amber-600 border-amber-400 text-[10px] px-1.5 py-0">
              personalizado
            </Badge>
          )}
        </div>
      </TableCell>

      <TableCell>
        {editing ? (
          <Input
            type="number" min={0} step={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-8 w-28 text-right"
            autoFocus
          />
        ) : (
          <>
            <span className="font-mono tabular-nums">{fmt(row.marketRate)}</span>
            {row.isCustomized && (
              <span className="ml-2 text-xs text-muted-foreground line-through">{fmt(defaultRate)}</span>
            )}
          </>
        )}
      </TableCell>

      <TableCell className="text-right">
        {editing ? (
          <div className="flex items-center justify-end gap-1">
            <Button size="sm" variant="ghost" className="h-7 px-2 text-green-600 hover:bg-green-50"
              onClick={handleSave} disabled={isPending}>
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:bg-destructive/10"
              onClick={() => setEditing(false)} disabled={isPending}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <TooltipProvider>
            <div className="flex items-center justify-end gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-7 px-2"
                    onClick={() => { setValue(String(row.marketRate)); setEditing(true); }} disabled={isPending}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Editar</TooltipContent>
              </Tooltip>
              {row.isCustomized && (
                <AlertDialog>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost"
                          className="h-7 px-2 text-muted-foreground hover:text-amber-600" disabled={isPending}>
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Restaurar padrão</TooltipContent>
                  </Tooltip>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Restaurar padrão?</AlertDialogTitle>
                      <AlertDialogDescription>
                        O perfil <strong>{row.label}</strong> voltará para {fmt(defaultRate)}/h.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleReset}>Restaurar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </TooltipProvider>
        )}
      </TableCell>
    </TableRow>
  );
}

// ── Linha do acelerador de equipe ─────────────────────────────────────────────

function AcceleratorRow({
  row,
  onUpdated,
}: {
  row: BenchmarkAcceleratorRow;
  onUpdated: (r: BenchmarkAcceleratorRow) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue]     = useState("");
  const [isPending, start]    = useTransition();

  function handleSave() {
    const accelerator = parseFloat(value.replace(",", "."));
    if (isNaN(accelerator) || accelerator < 0 || accelerator > 100) {
      toast.error("Valor deve ser entre 0 e 100"); return;
    }
    start(async () => {
      const res = await updateBenchmarkAcceleratorAction({ accelerator });
      if (res.success) { onUpdated(res.data); setEditing(false); toast.success("Acelerador atualizado"); }
      else toast.error(res.error);
    });
  }

  function handleReset() {
    start(async () => {
      const res = await resetBenchmarkAcceleratorAction();
      if (res.success) {
        onUpdated({ accelerator: TEAM_ACCELERATOR, isCustomized: false });
        toast.success("Acelerador restaurado para o padrão");
      } else toast.error(res.error);
    });
  }

  return (
    <TableRow className={row.isCustomized ? "bg-amber-50/40 dark:bg-amber-950/10" : undefined}>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          Acelerador de equipe
          {row.isCustomized && (
            <Badge variant="outline" className="text-amber-600 border-amber-400 text-[10px] px-1.5 py-0">
              personalizado
            </Badge>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Ganho de produtividade atribuído ao time interno (%)
        </p>
      </TableCell>

      <TableCell>
        {editing ? (
          <Input
            type="number" min={0} max={100} step={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-8 w-24 text-right"
            autoFocus
          />
        ) : (
          <>
            <span className="font-mono tabular-nums">{row.accelerator}%</span>
            {row.isCustomized && (
              <span className="ml-2 text-xs text-muted-foreground line-through">{TEAM_ACCELERATOR}%</span>
            )}
          </>
        )}
      </TableCell>

      <TableCell className="text-right">
        {editing ? (
          <div className="flex items-center justify-end gap-1">
            <Button size="sm" variant="ghost" className="h-7 px-2 text-green-600 hover:bg-green-50"
              onClick={handleSave} disabled={isPending}>
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:bg-destructive/10"
              onClick={() => setEditing(false)} disabled={isPending}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <TooltipProvider>
            <div className="flex items-center justify-end gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-7 px-2"
                    onClick={() => { setValue(String(row.accelerator)); setEditing(true); }} disabled={isPending}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Editar</TooltipContent>
              </Tooltip>
              {row.isCustomized && (
                <AlertDialog>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost"
                          className="h-7 px-2 text-muted-foreground hover:text-amber-600" disabled={isPending}>
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Restaurar padrão</TooltipContent>
                  </Tooltip>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Restaurar padrão?</AlertDialogTitle>
                      <AlertDialogDescription>
                        O acelerador voltará para <strong>{TEAM_ACCELERATOR}%</strong>.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleReset}>Restaurar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </TooltipProvider>
        )}
      </TableCell>
    </TableRow>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

type Props = {
  initialRates:       BenchmarkRateRow[];
  initialAccelerator: BenchmarkAcceleratorRow;
};

export function BenchmarkTable({ initialRates, initialAccelerator }: Props) {
  const [rates, setRates]           = useState<BenchmarkRateRow[]>(initialRates);
  const [accelerator, setAccelerator] = useState<BenchmarkAcceleratorRow>(initialAccelerator);

  const hasCustom = rates.some((r) => r.isCustomized) || accelerator.isCustomized;

  function handleRateUpdated(updated: BenchmarkRateRow) {
    setRates((prev) => prev.map((r) => (r.profile === updated.profile ? updated : r)));
  }

  return (
    <div className="space-y-3">
      {hasCustom && (
        <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-400">
          <Sparkles className="h-4 w-4 shrink-0" />
          Itens com badge <strong>personalizado</strong> utilizam valores customizados no cálculo do benchmark.
          O valor original aparece riscado para referência.
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-56">Parâmetro</TableHead>
              <TableHead className="w-40">Valor</TableHead>
              <TableHead className="text-right w-28">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rates.map((row) => (
              <RateRow key={row.profile} row={row} onUpdated={handleRateUpdated} />
            ))}
            <AcceleratorRow row={accelerator} onUpdated={setAccelerator} />
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
