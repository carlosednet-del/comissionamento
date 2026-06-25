"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Check, X, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { updatePricingConfigAction, resetPricingConfigAction } from "@/server/actions/pricingConfigActions";
import type { PricingConfigRow } from "@/services/pricingConfigService";
import { HOURLY_RATES, MONTHLY_CAPS } from "@/lib/demand-pricing";
import type { WorkerProfile } from "@prisma/client";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
}

// ── Linha editável ────────────────────────────────────────────────────────────

type EditState = {
  ratePerHour: string;
  monthlyCap:  string;
};

function ProfileRow({
  row,
  onUpdated,
}: {
  row: PricingConfigRow;
  onUpdated: (updated: PricingConfigRow) => void;
}) {
  const [editing, setEditing]     = useState(false);
  const [edit, setEdit]           = useState<EditState>({ ratePerHour: "", monthlyCap: "" });
  const [isPending, startTransition] = useTransition();

  const defaultRate = HOURLY_RATES[row.profile as WorkerProfile];
  const defaultCap  = MONTHLY_CAPS[row.profile  as WorkerProfile];

  function handleEdit() {
    setEdit({ ratePerHour: String(row.ratePerHour), monthlyCap: String(row.monthlyCap) });
    setEditing(true);
  }

  function handleCancel() {
    setEditing(false);
  }

  function handleSave() {
    const ratePerHour = parseFloat(edit.ratePerHour.replace(",", "."));
    const monthlyCap  = parseFloat(edit.monthlyCap.replace(",", "."));

    if (isNaN(ratePerHour) || ratePerHour <= 0) {
      toast.error("Valor/hora inválido");
      return;
    }
    if (isNaN(monthlyCap) || monthlyCap <= 0) {
      toast.error("Teto mensal inválido");
      return;
    }

    startTransition(async () => {
      const result = await updatePricingConfigAction({ profile: row.profile, ratePerHour, monthlyCap });
      if (result.success) {
        onUpdated(result.data);
        setEditing(false);
        toast.success(`Perfil ${row.label} atualizado`);
      } else {
        toast.error(!result.success ? result.error : "Erro ao salvar");
      }
    });
  }

  function handleReset() {
    startTransition(async () => {
      const result = await resetPricingConfigAction(row.profile);
      if (result.success) {
        onUpdated({ ...row, ratePerHour: defaultRate, monthlyCap: defaultCap, isCustomized: false });
        toast.success(`Perfil ${row.label} restaurado para o padrão`);
      } else {
        toast.error(!result.success ? result.error : "Erro ao resetar");
      }
    });
  }

  return (
    <TableRow className={row.isCustomized ? "bg-amber-50/40 dark:bg-amber-950/10" : undefined}>
      {/* Perfil */}
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

      {/* Valor/hora */}
      <TableCell>
        {editing ? (
          <Input
            type="number"
            min={0}
            step={0.01}
            value={edit.ratePerHour}
            onChange={(e) => setEdit((s) => ({ ...s, ratePerHour: e.target.value }))}
            className="h-8 w-28 text-right"
            autoFocus
          />
        ) : (
          <span className="font-mono tabular-nums">{formatCurrency(row.ratePerHour)}</span>
        )}
        {!editing && row.isCustomized && (
          <span className="ml-2 text-xs text-muted-foreground line-through">
            {formatCurrency(defaultRate)}
          </span>
        )}
      </TableCell>

      {/* Teto mensal */}
      <TableCell>
        {editing ? (
          <Input
            type="number"
            min={0}
            step={100}
            value={edit.monthlyCap}
            onChange={(e) => setEdit((s) => ({ ...s, monthlyCap: e.target.value }))}
            className="h-8 w-32 text-right"
          />
        ) : (
          <span className="font-mono tabular-nums">{formatCurrency(row.monthlyCap)}</span>
        )}
        {!editing && row.isCustomized && (
          <span className="ml-2 text-xs text-muted-foreground line-through">
            {formatCurrency(defaultCap)}
          </span>
        )}
      </TableCell>

      {/* Ações */}
      <TableCell className="text-right">
        {editing ? (
          <div className="flex items-center justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
              onClick={handleSave}
              disabled={isPending}
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleCancel}
              disabled={isPending}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <TooltipProvider>
            <div className="flex items-center justify-end gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={handleEdit}
                    disabled={isPending}
                  >
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
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-muted-foreground hover:text-amber-600"
                          disabled={isPending}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Restaurar padrão</TooltipContent>
                  </Tooltip>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Restaurar valores padrão?</AlertDialogTitle>
                      <AlertDialogDescription>
                        O perfil <strong>{row.label}</strong> voltará para os valores originais:
                        <br />
                        Valor/hora: <strong>{formatCurrency(defaultRate)}</strong> &nbsp;|&nbsp;
                        Teto mensal: <strong>{formatCurrency(defaultCap)}</strong>
                        <br /><br />
                        Esta ação não pode ser desfeita.
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

export function PricingTable({ initialRows }: { initialRows: PricingConfigRow[] }) {
  const [rows, setRows] = useState<PricingConfigRow[]>(initialRows);

  function handleUpdated(updated: PricingConfigRow) {
    setRows((prev) => prev.map((r) => (r.profile === updated.profile ? updated : r)));
  }

  const hasCustom = rows.some((r) => r.isCustomized);

  return (
    <div className="space-y-3">
      {hasCustom && (
        <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-400">
          <Sparkles className="h-4 w-4 shrink-0" />
          Perfis com badge <strong>personalizado</strong> utilizam valores customizados no cálculo de demandas.
          O valor original aparece riscado para referência.
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-48">Perfil</TableHead>
              <TableHead className="w-40">Valor / hora</TableHead>
              <TableHead className="w-44">Teto mensal</TableHead>
              <TableHead className="text-right w-28">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <ProfileRow key={row.profile} row={row} onUpdated={handleUpdated} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
