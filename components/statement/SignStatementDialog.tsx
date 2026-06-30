"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { signMyStatementAction } from "@/server/actions/statementActions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, PenLine } from "lucide-react";

type Props = {
  month: number;
  year:  number;
  onSigned: () => void;
};

export function SignStatementDialog({ month, year, onSigned }: Props) {
  const [open, setOpen]         = useState(false);
  const [agreed, setAgreed]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const MM = String(month).padStart(2, "0");

  function handleSign() {
    if (!agreed) { setError("Você deve marcar o checkbox para confirmar."); return; }
    setError(null);
    startTransition(async () => {
      const result = await signMyStatementAction(month, year);
      if (!result.success) { setError(result.error); return; }
      setOpen(false);
      setAgreed(false);
      toast.success("Extrato assinado com sucesso.", {
        description: `Código: ${result.data.signatureCode}`,
      });
      onSigned();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setAgreed(false); setError(null); } }}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
          <PenLine className="h-4 w-4" />
          Assinar extrato
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assinar extrato — {MM}/{year}</DialogTitle>
          <DialogDescription>
            Ao assinar, você confirma ciência dos valores e demandas apresentadas para o período.
            Esta ação é <strong>irreversível</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50 text-blue-800">
            <AlertDescription className="text-sm">
              Declaro que revisei o extrato do período selecionado e confirmo ciência dos valores
              e demandas apresentadas.
            </AlertDescription>
          </Alert>

          <div className="flex items-start gap-3 rounded-md border p-3">
            <input
              type="checkbox"
              id="agree"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              disabled={isPending}
              className="mt-0.5 h-4 w-4 cursor-pointer accent-emerald-600"
            />
            <label htmlFor="agree" className="text-sm cursor-pointer leading-relaxed">
              Li e concordo com o extrato apresentado.
            </label>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSign}
            disabled={isPending || !agreed}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            {isPending
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Assinando…</>
              : <><PenLine className="h-4 w-4" /> Assinar extrato</>
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
