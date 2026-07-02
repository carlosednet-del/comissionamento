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

import { useState, useEffect } from "react";
import { useRouter }           from "next/navigation";
import { useForm }             from "react-hook-form";
import { zodResolver }         from "@hookform/resolvers/zod";
import { z }                   from "zod";
import type { ComplexityLevel, RoiLevel, WorkerProfile } from "@prisma/client";
import {
  sendToHomologationSchema,
  homologateDemandSchema,
  rejectDemandSchema,
  cancelDemandSchema,
  startDevelopmentSchema,
  sendToAnalysisSchema,
  type SendToAnalysisInput,
} from "@/validations/demand";
import {
  openDemandAction,
  sendToAnalysisAction,
  sendToAnalysisWithDataAction,
  getAssigneesAction,
  approveDemandAction,
  startDevelopmentAction,
  sendToHomologationAction,
  homologateDemandAction,
  rejectDemandAction,
  returnToDevelopmentAction,
  cancelDemandAction,
  sendToDirectorPrioritizationAction,
  prioritizeAndApproveAction,
  returnFromDirectorPrioritizationAction,
  returnToOpenAction,
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
import {
  Select, SelectContent, SelectGroup, SelectItem,
  SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AttachEvidenceDialog } from "@/components/demandas/attach-evidence-dialog";
import {
  HOURLY_RATES,
  WORKER_PROFILE_LABELS,
  COMPLEXITY_LABELS,
  ROI_LABELS,
  calculateDemandEstimatedValue,
} from "@/lib/demand-pricing";
import { Loader2, Paperclip, PlayCircle, FlaskConical } from "lucide-react";
import { toast } from "sonner";

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

// ── Constantes compartilhadas ─────────────────────────────────────
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type Assignee = { id: string; name: string; role: string; workerProfile: WorkerProfile | null };

const ASSIGNABLE_ROLE_ORDER = ["DEV", "GESTOR", "ARQUITETO", "SUPORTE"] as const;
const ASSIGNABLE_ROLE_LABELS: Record<string, string> = {
  DEV: "Desenvolvedor", GESTOR: "Gestor", ARQUITETO: "Arquiteto", SUPORTE: "Suporte",
};

const COMPLEXITY_OPTIONS = (Object.keys(COMPLEXITY_LABELS) as ComplexityLevel[])
  .map((v) => ({ value: v, label: COMPLEXITY_LABELS[v] }));
const ROI_OPTIONS = (Object.keys(ROI_LABELS) as RoiLevel[])
  .map((v) => ({ value: v, label: ROI_LABELS[v] }));

// ── 0b. Enviar para análise (coleta dados técnicos) ───────────────

type SendToAnalysisProps = {
  demandId:     string;
  trigger:      React.ReactNode;
  initialData?: {
    assigneeId?:     string | null;
    estimatedHours?: number | null;
    complexity?:     ComplexityLevel | null;
    roi?:            RoiLevel | null;
  };
};

export function SendToAnalysisDialog({ demandId, trigger, initialData }: SendToAnalysisProps) {
  const { open, setOpen, error, setError, close, rerender } = useWorkflowDialog();
  const [assignees, setAssignees]           = useState<Assignee[]>([]);
  const [loadingAssignees, setLoadingAssignees] = useState(false);

  const form = useForm<SendToAnalysisInput>({
    resolver: zodResolver(sendToAnalysisSchema),
    defaultValues: {
      assigneeId:     initialData?.assigneeId     ?? "",
      estimatedHours: initialData?.estimatedHours ?? undefined,
      complexity:     initialData?.complexity     ?? undefined,
      roi:            initialData?.roi            ?? undefined,
    },
  });

  useEffect(() => {
    if (open && assignees.length === 0) {
      setLoadingAssignees(true);
      getAssigneesAction().then((data) => {
        setAssignees(data as Assignee[]);
        setLoadingAssignees(false);
      });
    }
  }, [open, assignees.length]);

  const watchedAssigneeId  = form.watch("assigneeId");
  const watchedHours       = form.watch("estimatedHours");
  const watchedComplexity  = form.watch("complexity");
  const watchedRoi         = form.watch("roi");

  const selectedAssignee  = assignees.find((a) => a.id === watchedAssigneeId) ?? null;
  const assigneeRole      = selectedAssignee?.role ?? null;
  const workerProfile     = selectedAssignee?.workerProfile ?? null;

  const pricingPreview = (() => {
    if (assigneeRole !== "DEV" || !workerProfile || !watchedHours || !watchedComplexity || !watchedRoi) return null;
    return calculateDemandEstimatedValue({
      workerProfile,
      estimatedHours: watchedHours,
      complexity: watchedComplexity,
      roi: watchedRoi,
    });
  })();

  const assigneesByRole = ASSIGNABLE_ROLE_ORDER.reduce<Record<string, Assignee[]>>((acc, role) => {
    const users = assignees.filter((a) => a.role === role);
    if (users.length) acc[role] = users;
    return acc;
  }, {});

  async function onSubmit(values: SendToAnalysisInput) {
    setError(null);
    const result = await sendToAnalysisWithDataAction(demandId, values);
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
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-amber-600" />
            Análise técnica
          </DialogTitle>
          <DialogDescription>
            Preencha os campos técnicos antes de enviar a demanda para análise.
            Estas informações serão usadas para calcular o valor estimado e na aprovação da diretoria.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* Responsável */}
            <FormField
              control={form.control}
              name="assigneeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsável técnico <span className="text-destructive">*</span></FormLabel>
                  <Select
                    disabled={loadingAssignees}
                    onValueChange={field.onChange}
                    value={field.value ?? ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={loadingAssignees ? "Carregando…" : "Selecionar responsável"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ASSIGNABLE_ROLE_ORDER.flatMap((role) => {
                        const users = assigneesByRole[role];
                        if (!users?.length) return [];
                        return [
                          <SelectGroup key={role}>
                            <SelectLabel>{ASSIGNABLE_ROLE_LABELS[role]}</SelectLabel>
                            {users.map((a) => (
                              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                            ))}
                          </SelectGroup>,
                        ];
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Horas + Complexidade */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="estimatedHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horas estimadas <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0.5}
                        step={0.5}
                        placeholder="Ex.: 8"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? undefined : e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="complexity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Complexidade <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COMPLEXITY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ROI */}
            <FormField
              control={form.control}
              name="roi"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ROI / Impacto estratégico <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ROI_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Preview de valor estimado */}
            {selectedAssignee && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1 text-sm">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Perfil técnico</span>
                  <span>{workerProfile ? WORKER_PROFILE_LABELS[workerProfile] : "—"}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Valor / hora</span>
                  <span className="font-mono">
                    {assigneeRole === "DEV" && workerProfile ? BRL.format(HOURLY_RATES[workerProfile]) : "R$ 0,00"}
                  </span>
                </div>
                {pricingPreview && (
                  <div className="flex justify-between border-t pt-1.5 mt-1">
                    <span className="font-medium text-brand-text-dark">Valor estimado (prévia)</span>
                    <span className="font-bold font-mono text-brand-text-dark">
                      {BRL.format(pricingPreview.estimatedValue)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={close} disabled={form.formState.isSubmitting}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting || loadingAssignees}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <FlaskConical className="mr-2 h-4 w-4" />
                Enviar para análise
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── 1. Confirmação simples ────────────────────────────────────────
type ConfirmAction = "open" | "analysis" | "approve" | "return" | "sendToDirector" | "returnFromDirector" | "returnToOpen";

type ConfirmProps = {
  demandId:    string;
  action:      ConfirmAction;
  title:       string;
  description: string;
  confirmLabel?: string;
  trigger:     React.ReactNode;
};

const CONFIRM_ACTIONS: Record<ConfirmAction, (id: string) => Promise<{ success: boolean; error?: string }>> = {
  open:               openDemandAction,
  analysis:           sendToAnalysisAction,
  approve:            approveDemandAction,
  return:             returnToDevelopmentAction,
  sendToDirector:     sendToDirectorPrioritizationAction,
  // returnFromDirector é tratado por ReturnFromDirectorDialog (requer motivo)
  returnFromDirector: (_id) => Promise.resolve({ success: false, error: "Use ReturnFromDirectorDialog" }),
  returnToOpen:       returnToOpenAction,
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

// ── 1b. Iniciar desenvolvimento (coleta datas previstas) ─────────
const startDevForm = startDevelopmentSchema;
type StartDevFormValues = z.infer<typeof startDevForm>;

type StartDevelopmentProps = {
  demandId:       string;
  trigger:        React.ReactNode;
  allowPastDates?: boolean;
};

export function StartDevelopmentDialog({ demandId, trigger, allowPastDates = false }: StartDevelopmentProps) {
  const { open, setOpen, error, setError, close, rerender } = useWorkflowDialog();

  const today = new Date().toISOString().slice(0, 10);

  const form = useForm<StartDevFormValues>({
    resolver: zodResolver(startDevForm),
    defaultValues: {
      plannedStartDate:    new Date(),
      plannedDeliveryDate: undefined,
    },
  });

  const watchedStart = form.watch("plannedStartDate");
  const minDelivery  = allowPastDates
    ? (watchedStart ? new Date(watchedStart).toISOString().slice(0, 10) : undefined)
    : (watchedStart ? new Date(watchedStart).toISOString().slice(0, 10) : today);

  async function onSubmit(values: StartDevFormValues) {
    setError(null);
    const result = await startDevelopmentAction(demandId, values);
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
          <DialogTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-purple-600" />
            Iniciar desenvolvimento
          </DialogTitle>
          <DialogDescription>
            Informe as datas previstas para esta atividade. A data de início real será registrada automaticamente.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="plannedStartDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início previsto <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        min={allowPastDates ? undefined : today}
                        value={field.value ? new Date(field.value).toISOString().slice(0, 10) : ""}
                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="plannedDeliveryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entrega prevista <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        min={minDelivery}
                        value={field.value ? new Date(field.value).toISOString().slice(0, 10) : ""}
                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {allowPastDates && (
              <p className="text-xs text-muted-foreground">
                Gestor pode definir datas retroativas.
              </p>
            )}

            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={close} disabled={form.formState.isSubmitting}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Iniciar desenvolvimento
              </Button>
            </DialogFooter>
          </form>
        </Form>
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

        {/* Aviso + atalho para anexar evidência */}
        <div className={`rounded-lg border p-3 text-sm space-y-2 ${
          evidenceCount === 0
            ? "border-amber-200 bg-amber-50 text-amber-800"
            : "border-emerald-200 bg-emerald-50 text-emerald-800"
        }`}>
          <p>
            {evidenceCount === 0
              ? "⚠ Nenhuma evidência cadastrada. Recomendamos anexar ao menos uma evidência (print, PR, documento) antes de enviar."
              : `✓ ${evidenceCount} evidência${evidenceCount > 1 ? "s" : ""} cadastrada${evidenceCount > 1 ? "s" : ""}.`}
          </p>
          <AttachEvidenceDialog
            demandId={demandId}
            trigger={
              <Button type="button" variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
                <Paperclip className="h-3.5 w-3.5" />
                Anexar evidência
              </Button>
            }
          />
        </div>

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

// ── 5b. Priorizar e aprovar (Diretoria) ──────────────────────────
const prioritizeSchema = z.object({
  directorPriorityOrder: z.coerce.number().int()
    .min(1, "Ordem deve ser >= 1")
    .max(100, "Ordem deve ser <= 100"),
  prioritizationNotes: z.string().optional(),
});
type PrioritizeFormValues = z.infer<typeof prioritizeSchema>;

type PrioritizeProps = {
  demandId: string;
  trigger:  React.ReactNode;
};

export function PrioritizeAndApproveDialog({ demandId, trigger }: PrioritizeProps) {
  const { open, setOpen, error, setError, close, rerender } = useWorkflowDialog();

  const form = useForm<PrioritizeFormValues>({
    resolver: zodResolver(prioritizeSchema),
    defaultValues: { directorPriorityOrder: 1, prioritizationNotes: "" },
  });

  async function onSubmit(values: PrioritizeFormValues) {
    setError(null);
    const result = await prioritizeAndApproveAction(demandId, {
      directorPriorityOrder: values.directorPriorityOrder,
      prioritizationNotes: values.prioritizationNotes || undefined,
    });
    if (!result.success) { setError(result.error ?? "Erro"); return; }
    close();
    form.reset();
    toast.success("Demanda priorizada e aprovada com sucesso.");
    rerender();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setError(null); form.reset(); } }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Priorizar e aprovar demanda</DialogTitle>
          <DialogDescription>
            Defina a ordem de prioridade da diretoria para liberar a demanda para desenvolvimento.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="directorPriorityOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prioridade da diretoria <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input type="number" min={1} max={100} {...field} />
                  </FormControl>
                  <p className="text-[11px] text-muted-foreground">
                    Use 1 para maior prioridade e 100 para menor prioridade.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="prioritizationNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações da priorização</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações sobre a priorização da diretoria…"
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
              <Button type="submit" disabled={form.formState.isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Priorizar e aprovar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── 5c. Devolver da priorização da diretoria ────────────────────
const returnFromDirectorSchema = z.object({
  returnReason: z.string().min(5, "Informe o motivo da devolução (mín. 5 caracteres)"),
});
type ReturnFromDirectorFormValues = z.infer<typeof returnFromDirectorSchema>;

type ReturnFromDirectorProps = {
  demandId: string;
  trigger:  React.ReactNode;
};

export function ReturnFromDirectorDialog({ demandId, trigger }: ReturnFromDirectorProps) {
  const { open, setOpen, error, setError, close, rerender } = useWorkflowDialog();

  const form = useForm<ReturnFromDirectorFormValues>({
    resolver: zodResolver(returnFromDirectorSchema),
    defaultValues: { returnReason: "" },
  });

  async function onSubmit(values: ReturnFromDirectorFormValues) {
    setError(null);
    const result = await returnFromDirectorPrioritizationAction(demandId, values.returnReason);
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
          <DialogTitle>Devolver para análise</DialogTitle>
          <DialogDescription>
            A demanda voltará para análise técnica para revisão antes de nova priorização.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="returnReason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo da devolução <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Informe o motivo pelo qual esta demanda está sendo devolvida para análise…"
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
                Cancelar
              </Button>
              <Button type="submit" variant="outline" disabled={form.formState.isSubmitting}
                className="border-amber-300 text-amber-700 hover:bg-amber-50">
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Devolver para análise
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
