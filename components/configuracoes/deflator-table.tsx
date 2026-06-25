"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Check, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { updateDeflatorFactorAction, resetDeflatorFactorAction } from "@/server/actions/pricingConfigActions";
import type { DeflatorRow } from "@/services/pricingConfigService";
import { DEFLATOR_FACTORS } from "@/lib/demand-pricing";
import { Badge } from "@/components/ui/badge";

// ── Helpers ───────────────────────────────────────────────────────────────────

function deflatorClass(v: number) {
  if (v === 1.00) return "bg-green-100  text-green-800  dark:bg-green-950  dark:text-green-200";
  if (v >= 0.50)  return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200";
  if (v > 0)      return "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200";
  return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200";
}

function situacao(v: number) {
  if (v === 1.00) return "Valor integral";
  if (v >= 0.50)  return "Redução parcial";
  if (v > 0)      return "Redução severa";
  return "Valor zerado";
}

// ── Linha editável ────────────────────────────────────────────────────────────

function DeflatorRowComponent({
  row,
  onUpdated,
}: {
  row: DeflatorRow;
  onUpdated: (r: DeflatorRow) => void;
}) {
  const [editing, setEditing]          = useState(false);
  const [value, setValue]              = useState("");
  const [isPending, startTransition]   = useTransition();
  const defaultFactor = row.daysLate === 5 ? 0 : (DEFLATOR_FACTORS[row.daysLate] ?? 0);
  const discount      = `−${((1 - row.factor) * 100).toFixed(0)}%`;

  function startEdit() {
    setValue(String(row.factor));
    setEditing(true);
  }

  function handleSave() {
    const factor = parseFloat(value.replace(",", "."));
    if (isNaN(factor) || factor < 0 || factor > 1) {
      toast.error("Fator deve estar entre 0 e 1");
      return;
    }
    startTransition(async () => {
      const res = await updateDeflatorFactorAction({ daysLate: row.daysLate, factor });
      if (res.success) {
        onUpdated(res.data);
        setEditing(false);
        toast.success(`Deflator ${row.label} atualizado`);
      } else {
        toast.error(!res.success ? res.error : "Erro");
      }
    });
  }

  function handleReset() {
    startTransition(async () => {
      const res = await resetDeflatorFactorAction(row.daysLate);
      if (res.success) {
        onUpdated({ ...row, factor: defaultFactor, isCustomized: false });
        toast.success(`Deflator ${row.label} restaurado para o padrão`);
      } else {
        toast.error(!res.success ? res.error : "Erro");
      }
    });
  }

  return (
    <TableRow className={row.isCustomized ? "bg-amber-50/40 dark:bg-amber-950/10" : undefined}>
      {/* Atraso */}
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

      {/* Fator */}
      <TableCell>
        {editing ? (
          <Input
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-8 w-24 text-center"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
          />
        ) : (
          <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold tabular-nums ${deflatorClass(row.factor)}`}>
            ×{row.factor.toFixed(2)}
          </span>
        )}
        {!editing && row.isCustomized && (
          <span className="ml-2 text-xs text-muted-foreground line-through">
            ×{defaultFactor.toFixed(2)}
          </span>
        )}
      </TableCell>

      {/* Desconto */}
      <TableCell className="text-center tabular-nums text-muted-foreground">
        {discount}
      </TableCell>

      {/* Situação */}
      <TableCell className="text-muted-foreground text-xs">
        {situacao(row.factor)}
      </TableCell>

      {/* Ações */}
      <TableCell className="text-right">
        {editing ? (
          <div className="flex items-center justify-end gap-1">
            <Button size="sm" variant="ghost" className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={handleSave} disabled={isPending}>
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => setEditing(false)} disabled={isPending}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <TooltipProvider>
            <div className="flex items-center justify-end gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={startEdit} disabled={isPending}>
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
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground hover:text-amber-600" disabled={isPending}>
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Restaurar padrão</TooltipContent>
                  </Tooltip>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Restaurar fator padrão?</AlertDialogTitle>
                      <AlertDialogDescription>
                        <strong>{row.label}</strong> voltará para o fator padrão:{" "}
                        <strong>×{defaultFactor.toFixed(2)}</strong>.
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

export function DeflatorTable({ initialRows }: { initialRows: DeflatorRow[] }) {
  const [rows, setRows] = useState(initialRows);

  function handleUpdated(updated: DeflatorRow) {
    setRows((prev) => prev.map((r) => (r.daysLate === updated.daysLate ? updated : r)));
  }

  return (
    <div className="rounded-lg border max-w-lg">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="w-36">Atraso</TableHead>
            <TableHead className="w-28">Fator</TableHead>
            <TableHead className="w-24 text-center">Desconto</TableHead>
            <TableHead className="w-32">Situação</TableHead>
            <TableHead className="text-right w-24">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <DeflatorRowComponent key={row.daysLate} row={row} onUpdated={handleUpdated} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
