"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { updateCombinedFactorAction, resetCombinedFactorAction } from "@/server/actions/pricingConfigActions";
import type { CombinedFactorRow } from "@/services/pricingConfigService";
import { COMBINED_FACTORS } from "@/lib/demand-pricing";
import type { ComplexityLevel, RoiLevel } from "@prisma/client";

// ── Helpers ───────────────────────────────────────────────────────────────────

function factorClass(v: number) {
  if (v >= 2.0) return "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200";
  if (v >= 1.5) return "bg-blue-100   text-blue-800   dark:bg-blue-950   dark:text-blue-200";
  if (v >= 1.2) return "bg-green-100  text-green-800  dark:bg-green-950  dark:text-green-200";
  return "bg-muted text-muted-foreground";
}

const COMPLEXITIES: ComplexityLevel[] = ["BAIXA", "MEDIA", "ALTA", "CRITICA"];
const ROIS: RoiLevel[]               = ["BAIXO", "MEDIO", "ALTO", "ESTRATEGICO"];

// ── Célula editável ───────────────────────────────────────────────────────────

function FactorCell({
  row,
  onUpdated,
}: {
  row: CombinedFactorRow;
  onUpdated: (r: CombinedFactorRow) => void;
}) {
  const [editing, setEditing]          = useState(false);
  const [value, setValue]              = useState("");
  const [isPending, startTransition]   = useTransition();
  const defaultFactor = COMBINED_FACTORS[row.complexity][row.roi];

  function startEdit() {
    setValue(String(row.factor));
    setEditing(true);
  }

  function handleSave() {
    const factor = parseFloat(value.replace(",", "."));
    if (isNaN(factor) || factor <= 0) { toast.error("Fator deve ser maior que zero"); return; }
    startTransition(async () => {
      const res = await updateCombinedFactorAction({ complexity: row.complexity, roi: row.roi, factor });
      if (res.success) {
        onUpdated(res.data);
        setEditing(false);
        toast.success(`Fator ${row.complexityLabel} × ${row.roiLabel} atualizado`);
      } else {
        toast.error(!res.success ? res.error : "Erro");
      }
    });
  }

  function handleReset() {
    startTransition(async () => {
      const res = await resetCombinedFactorAction({ complexity: row.complexity, roi: row.roi });
      if (res.success) {
        onUpdated({ ...row, factor: defaultFactor, isCustomized: false });
        toast.success(`Fator ${row.complexityLabel} × ${row.roiLabel} restaurado`);
      } else {
        toast.error(!res.success ? res.error : "Erro");
      }
    });
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 justify-center">
        <Input
          type="number"
          min={0.01}
          step={0.05}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-7 w-20 text-center px-1 text-xs"
          autoFocus
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
        />
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-green-600" onClick={handleSave} disabled={isPending}>
          <Check className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => setEditing(false)} disabled={isPending}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex items-center justify-center gap-1 group">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={startEdit}
              disabled={isPending}
              className={`inline-block rounded px-2 py-0.5 text-xs font-semibold tabular-nums cursor-pointer hover:opacity-80 transition-opacity ${factorClass(row.factor)} ${row.isCustomized ? "ring-1 ring-amber-400" : ""}`}
            >
              ×{row.factor.toFixed(2)}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {row.isCustomized
              ? `Personalizado (padrão: ×${defaultFactor.toFixed(2)}) — clique para editar`
              : "Clique para editar"}
          </TooltipContent>
        </Tooltip>

        {row.isCustomized && (
          <AlertDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-amber-600 transition-opacity" disabled={isPending}>
                    <RotateCcw className="h-2.5 w-2.5" />
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent>Restaurar padrão (×{defaultFactor.toFixed(2)})</TooltipContent>
            </Tooltip>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Restaurar fator padrão?</AlertDialogTitle>
                <AlertDialogDescription>
                  <strong>{row.complexityLabel} × {row.roiLabel}</strong> voltará para{" "}
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
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function CombinedFactorTable({ initialRows }: { initialRows: CombinedFactorRow[] }) {
  const [rows, setRows] = useState(initialRows);

  // Mapa para lookup rápido
  const key = (c: ComplexityLevel, r: RoiLevel) => `${c}:${r}`;
  const rowMap = new Map(rows.map((r) => [key(r.complexity, r.roi), r]));

  function handleUpdated(updated: CombinedFactorRow) {
    setRows((prev) => prev.map((r) =>
      r.complexity === updated.complexity && r.roi === updated.roi ? updated : r
    ));
  }

  const hasCustom = rows.some((r) => r.isCustomized);

  return (
    <div className="space-y-2">
      {hasCustom && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          ⚠ Células com anel laranja possuem valor personalizado. Passe o mouse para ver o botão de restaurar.
        </p>
      )}

      <div className="rounded-lg border overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 border-b">
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-32">
                Complexidade \ ROI
              </th>
              {ROIS.map((roi) => {
                const sample = rowMap.get(key(COMPLEXITIES[0], roi));
                return (
                  <th key={roi} className="px-4 py-2.5 font-medium text-center">
                    {sample?.roiLabel ?? roi}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {COMPLEXITIES.map((complexity, ci) => {
              const sampleRow = rowMap.get(key(complexity, ROIS[0]));
              return (
                <tr key={complexity} className={ci % 2 === 0 ? "" : "bg-muted/20"}>
                  <td className="px-4 py-2.5 font-medium">{sampleRow?.complexityLabel ?? complexity}</td>
                  {ROIS.map((roi) => {
                    const row = rowMap.get(key(complexity, roi));
                    if (!row) return <td key={roi} />;
                    return (
                      <td key={roi} className="px-4 py-2.5 text-center">
                        <FactorCell row={row} onUpdated={handleUpdated} />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Clique em qualquer valor para editar. Enter para confirmar, Esc para cancelar.
      </p>
    </div>
  );
}
