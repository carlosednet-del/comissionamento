"use client";

/**
 * Dialogs especializados do Workflow de Demandas
 *
 * Exporta:
 *  - ConfirmTransitionDialog  — confirmação simples (com motivo opcional)
 *  - SendToHomologationDialog — data de entrega real + observações
 *  - HomologateDialog         — observações de homologação + confirmação
 *  - RejectDemandDialog       — motivo obrigatório (mín. 10 chars)
 *  - CancelDemandDialog       — motivo obrigatório (mín. 10 chars)
 */

import { useState }       from "react";
import { useRouter }      from "next/navigation";
import { useForm }        from "react-hook-form";
import { zodResolver }    from "@hookform/resolvers/zod";
import { z }              from "zod";
import {
  sendToHomologationSchema,
  homologateDemandSchema,
  rejectDemandSchema,
  cancelDemandSchema,
} from "@/validations/demand";
import {
  openDemandAction,
  sendToAnalysisAction,
  approveDemandAction,
  startDevelopmentAction,
  sendToHomologationAction,
  homologateDemandAction,
  rejectDemandAction,
  returnToDevelopmentAction,
  cancelDemandAction,
} from "@/server/actions/demandActions";
import { Button }            from "@/components/ui/button";
import { Input }             from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";

// ── Textarea ─────────────────────────────────────────────────────
function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { rows?: number }) {
  const { rows = 3, className = "", ...rest } = props;
  return (
    <textarea
      rows={rows}
      className={`flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm
        ring-offset-background placeholder:text-muted-foreground
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
        disabled:cursor-not-allowed disabled:opacity-50 resize-none ${className}`}
      {...rest}
    />
  );
}

// ── Helpers ──────────────────────────────────────────────────────
function useWorkflowDialog() {
  const router              = useRouter();
  const [open, setOpen]     = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function close()  { setOpen(false); setError(null); }
  function rerender() { router.refresh(); }

  return { open, setOpen, error, setError, saving, setSaving, close, rerender };
}

// ── 1. Confirmação simples ────────────────────────────────────────
type ConfirmAction = "open" | "analysis" | "approve" | "start" | "return";

type ConfirmProps = {
  demandId:    string;
  action:      ConfirmAction;
  title:       string;
  description: string;
  confirmLabel?: string;
  trigger:     React.ReactNode;
};

const CONFIRM_ACTIONS: Record<ConfirmAction, (id: string) => Promise<{ success: boolean; error?: string }>> = {
  open:     openDemandAction,
  analysis: sendToAnalysisAction,
  approve:  approveDemandAction,
  start:    startDevelopmentAction,
  return:   returnToDevelopmentAction,
};

export function ConfirmTransitionDialog({
  demandId, action, title, description, confirmLabel = "Confirmar", trigger,
}: ConfirmProps) {
  const { open, setOpen, error, setError, saving, setSaving, close, rerender } = useWorkflowDialog();

  async function handleConfirm() {
    setSaving(true);
    setError(null);
    const result = await CONFIRM_ACTIONS[action](demandId);
    setSaving(false);
    if (!result.success) { setError(result.error ?? "Erro desconhecido"); return; }
    close();
    rerender();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError(null); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={saving}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── 2. Enviar para homologação ────────────────────────────────────
const homolForm = sendToHomologationSchema;
type HomolFormValues = z.infer<typeof homolForm>;

type SendToHomolProps = {
  demandId:       string;
  evidenceCount:  number;
  trigger:        React.ReactNode;
};

export function SendToHomologationDialog({ demandId, evidenceCount, trigger }: SendToHomolProps) {
  const { open, setOpen, error, setError, close, rerender } = useWorkflowDialog();

  const form = useForm<HomolFormValues>({
    resolver: zodResolver(homolForm),
    defaultValues: { deliveryNotes: "" },
  });

  async function onSubmit(values: HomolFormValues) {
    setError(null);
    const result = await sendToHomologationAction(demandId, values);
    if (!result.success) { setError(result.error ?? "Erro"); return; }
    close();
    form.reset();
    rerender();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setError(null); form.reset(); } }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar para homologação</DialogTitle>
          <DialogDescription>
            Informe a data real de entrega e observações antes de enviar para homologação.
          </DialogDescription>
        </DialogHeader>

        {evidenceCount === 0 && (
          <Alert>
            <AlertDescription className="text-amber-700">
              ⚠ Nenhuma evidência cadastrada. Recomendamos anexar ao menos uma evidência (print, PR, documento) antes de enviar para homologação.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="actualDeliveryDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data real de entrega <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value ? new Date(field.value).toISOString().slice(0,10) : ""}
                      onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deliveryNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações da entrega</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o que foi entregue, destaques ou informações para o homologador…"
                      rows={3}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={close} disabled={form.formState.isSubmitting}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar para homologação
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── 3. Homologar em produção ──────────────────────────────────────
const homologateForm = homologateDemandSchema;
type HomologateFormValues = z.infer<typeof homologateForm>;

type HomologateProps = {
  demandId: string;
  trigger:  React.ReactNode;
};

export function HomologateDialog({ demandId, trigger }: HomologateProps) {
  const { open, setOpen, error, setError, close, rerender } = useWorkflowDialog();

  const form = useForm<HomologateFormValues>({
    resolver: zodResolver(homologateForm),
    defaultValues: { homologationNotes: "" },
  });

  async function onSubmit(values: HomologateFormValues) {
    setError(null);
    const result = await homologateDemandAction(demandId, values);
    if (!result.success) { setError(result.error ?? "Erro"); return; }
    close();
    form.reset();
    rerender();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setError(null); form.reset(); } }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Homologar em produção</DialogTitle>
          <DialogDescription>
            Confirme a homologação da demanda em produção. Esta ação não gera pagamento — apenas marca a demanda como homologada.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="homologationNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações da homologação</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o resultado da homologação, ajustes realizados ou observações relevantes…"
                      rows={4}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={close} disabled={form.formState.isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}
                className="bg-green-600 hover:bg-green-700 text-white">
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Homologar em produção
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── 4. Reprovar ───────────────────────────────────────────────────
const rejectForm = rejectDemandSchema;
type RejectFormValues = z.infer<typeof rejectForm>;

type RejectProps = {
  demandId: string;
  trigger:  React.ReactNode;
};

export function RejectDemandDialog({ demandId, trigger }: RejectProps) {
  const { open, setOpen, error, setError, close, rerender } = useWorkflowDialog();

  const form = useForm<RejectFormValues>({
    resolver: zodResolver(rejectForm),
    defaultValues: { rejectionReason: "" },
  });

  async function onSubmit(values: RejectFormValues) {
    setError(null);
    const result = await rejectDemandAction(demandId, values);
    if (!result.success) { setError(result.error ?? "Erro"); return; }
    close();
    form.reset();
    rerender();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setError(null); form.reset(); } }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reprovar demanda</DialogTitle>
          <DialogDescription>
            Informe o motivo da reprovação. A demanda retornará para revisão pelo desenvolvedor.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="rejectionReason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo da reprovação <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva detalhadamente o motivo da reprovação (mín. 10 caracteres)…"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={close} disabled={form.formState.isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reprovar demanda
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── 5. Cancelar ───────────────────────────────────────────────────
const cancelForm = cancelDemandSchema;
type CancelFormValues = z.infer<typeof cancelForm>;

type CancelProps = {
  demandId: string;
  trigger:  React.ReactNode;
};

export function CancelDemandDialog({ demandId, trigger }: CancelProps) {
  const { open, setOpen, error, setError, close, rerender } = useWorkflowDialog();

  const form = useForm<CancelFormValues>({
    resolver: zodResolver(cancelForm),
    defaultValues: { cancellationReason: "" },
  });

  async function onSubmit(values: CancelFormValues) {
    setError(null);
    const result = await cancelDemandAction(demandId, values);
    if (!result.success) { setError(result.error ?? "Erro"); return; }
    close();
    form.reset();
    rerender();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setError(null); form.reset(); } }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar demanda</DialogTitle>
          <DialogDescription>
            Esta ação não pode ser desfeita. A demanda será marcada como cancelada.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="cancellationReason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo do cancelamento <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Informe o motivo do cancelamento (mín. 10 caracteres)…"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={close} disabled={form.formState.isSubmitting}>
                Voltar
              </Button>
              <Button type="submit" variant="destructive" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar cancelamento
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
