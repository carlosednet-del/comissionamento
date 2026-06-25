"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DemandStatus } from "@prisma/client";
import { changeDemandStatusAction } from "@/server/actions/demandActions";
import { ALLOWED_TRANSITIONS } from "@/validations/demand";
import { STATUS_CONFIG } from "./status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  demandId:      string;
  currentStatus: DemandStatus;
  trigger:       React.ReactNode;
  /** Restrict to a specific target status, or show all allowed targets */
  targetStatus?: DemandStatus;
};

const REASON_REQUIRED: DemandStatus[] = ["REPROVADA", "CANCELADA"];

export function ChangeStatusDialog({ demandId, currentStatus, trigger, targetStatus }: Props) {
  const router = useRouter();
  const [open, setOpen]         = useState(false);
  const [selected, setSelected] = useState<DemandStatus | null>(targetStatus ?? null);
  const [reason, setReason]     = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);

  const allowedTargets = ALLOWED_TRANSITIONS[currentStatus] ?? [];
  const targets = targetStatus ? [targetStatus] : allowedTargets;

  const needsReason = selected ? REASON_REQUIRED.includes(selected) : false;

  function reset() {
    setSelected(targetStatus ?? null);
    setReason("");
    setError(null);
  }

  async function handleConfirm() {
    if (!selected) return;
    if (needsReason && reason.trim().length < 5) {
      setError("Informe o motivo (mínimo 5 caracteres).");
      return;
    }

    setSaving(true);
    setError(null);

    const result = await changeDemandStatusAction(demandId, {
      currentStatus,
      newStatus: selected,
      reason: reason.trim() || undefined,
    });

    setSaving(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Alterar status da demanda</DialogTitle>
          <DialogDescription>
            Selecione o novo status para a demanda.
          </DialogDescription>
        </DialogHeader>

        {/* Transição visual */}
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
              STATUS_CONFIG[currentStatus].style,
            )}
          >
            {STATUS_CONFIG[currentStatus].label}
          </span>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          {selected ? (
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                STATUS_CONFIG[selected].style,
              )}
            >
              {STATUS_CONFIG[selected].label}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground italic">selecione abaixo</span>
          )}
        </div>

        {/* Seleção de status alvo */}
        {targets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma transição de status disponível a partir do status atual.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {targets.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSelected(s)}
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-all",
                  STATUS_CONFIG[s].style,
                  selected === s
                    ? "ring-2 ring-offset-2 ring-brand-primary scale-105"
                    : "opacity-70 hover:opacity-100",
                )}
              >
                {STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>
        )}

        {/* Motivo */}
        {selected && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Motivo{needsReason && <span className="text-destructive ml-1">*</span>}
            </label>
            <textarea
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              placeholder={
                needsReason
                  ? "Informe o motivo obrigatoriamente…"
                  : "Informe o motivo (opcional)…"
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selected || saving}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
