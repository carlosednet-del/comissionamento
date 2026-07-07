"use client";

/**
 * DropTransitionDialog — acionado pelo DnD do Kanban
 *
 * Diálogo controlado (sem DialogTrigger) que aparece automaticamente
 * após um arrastar-e-soltar válido. Renderiza o formulário correto
 * para cada tipo de transição e chama a Server Action correspondente.
 */

import { useRouter }      from "next/navigation";
import { useForm }        from "react-hook-form";
import { zodResolver }    from "@hookform/resolvers/zod";
import { z }              from "zod";
import {
  sendToHomologationSchema,
  homologateDemandSchema,
  rejectDemandSchema,
  cancelDemandSchema,
  startDevelopmentSchema,
  sendToAnalysisSchema,
  type SendToAnalysisInput,
} from "@/validations/demand";
import type { StartDevelopmentInput } from "@/validations/demand";
import type { ComplexityLevel, RoiLevel, WorkerProfile } from "@prisma/client";
import {
  openDemandAction,
  returnToOpenAction,
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
  returnFromDirectorPrioritizationAction,
} from "@/server/actions/demandActions";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectGroup, SelectItem,
  SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { FlaskConical, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import type { DemandStatus } from "@/types";
import {
  HOURLY_RATES,
  WORKER_PROFILE_LABELS,
  COMPLEXITY_LABELS,
  ROI_LABELS,
  calculateDemandEstimatedValue,
} from "@/lib/demand-pricing";

// ── Textarea inline ──────────────────────────────────────────────
function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { rows?: number },
) {
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

// ── Tipos ─────────────────────────────────────────────────────────

export type PendingDrop = {
  demandId:    string;
  demandTitle: string;
  fromStatus:  DemandStatus;
  toStatus:    DemandStatus;
};

type Props = {
  pending:        PendingDrop | null;
  onSuccess:      () => void;
  onCancel:       () => void;
  allowPastDates?: boolean;
};

// ── Configuração por transição ────────────────────────────────────

type TransitionMeta = {
  title:       string;
  description: string;
  confirmLabel: string;
  variant?: "default" | "destructive";
  confirmClass?: string;
};

const TRANSITION_META: Partial<Record<DemandStatus, TransitionMeta>> = {
  ABERTA:                 { title: "Abrir demanda",               description: "A demanda será publicada e ficará disponível para análise.",          confirmLabel: "Abrir demanda" },
  EM_ANALISE:             { title: "Enviar para análise",          description: "A demanda será movida para análise técnica.",                         confirmLabel: "Enviar para análise" },
  PRIORIZACAO_DIRETORIA:  { title: "Enviar para priori. diretoria", description: "A demanda será encaminhada para a diretoria priorizar e aprovar.",  confirmLabel: "Enviar", confirmClass: "bg-indigo-600 hover:bg-indigo-700 text-white" },
  APROVADA:               { title: "Aprovar demanda",              description: "A demanda será aprovada e liberada para desenvolvimento.",             confirmLabel: "Aprovar", confirmClass: "bg-emerald-600 hover:bg-emerald-700 text-white" },
  EM_DESENVOLVIMENTO:     { title: "Iniciar / retornar",           description: "A demanda entrará em desenvolvimento.",                               confirmLabel: "Confirmar" },
  AGUARDANDO_HOMOLOGACAO: { title: "Enviar para homologação",      description: "Informe a data real de entrega e observações.",                       confirmLabel: "Enviar para homologação", confirmClass: "bg-orange-500 hover:bg-orange-600 text-white" },
  HOMOLOGADA_PRODUCAO:    { title: "Homologar em produção",        description: "Confirme a homologação em produção.",                                 confirmLabel: "Homologar", confirmClass: "bg-green-600 hover:bg-green-700 text-white" },
  REPROVADA:              { title: "Reprovar demanda",             description: "Informe o motivo da reprovação. A demanda voltará ao desenvolvedor.",  confirmLabel: "Reprovar", variant: "destructive" },
  CANCELADA:              { title: "Cancelar demanda",             description: "Esta ação não pode ser desfeita.",                                    confirmLabel: "Cancelar demanda", variant: "destructive" },
};

// ── Tipos de transição ────────────────────────────────────────────

/** Transições simples — apenas confirmação, sem dados extras */
const SIMPLE_TRANSITIONS = new Set<DemandStatus>([
  "ABERTA", "PRIORIZACAO_DIRETORIA", "APROVADA",
]);

/** Transições para EM_DESENVOLVIMENTO que são simples (retorno) */
const RETURN_TO_DEV_FROM = new Set<DemandStatus>(["REPROVADA", "AGUARDANDO_HOMOLOGACAO"]);

/** Ação para transições simples */
type SimpleAction = (id: string) => Promise<{ success: boolean; error?: string }>;

function getSimpleAction(toStatus: DemandStatus, fromStatus: DemandStatus): SimpleAction {
  if (toStatus === "ABERTA")                return openDemandAction;
  if (toStatus === "PRIORIZACAO_DIRETORIA") return sendToDirectorPrioritizationAction;
  if (toStatus === "APROVADA")              return approveDemandAction;
  // EM_ANALISE via retorno da diretoria (simples)
  if (toStatus === "EM_ANALISE" && fromStatus === "PRIORIZACAO_DIRETORIA") {
    return (id: string) => returnFromDirectorPrioritizationAction(id, "Devolução via Kanban (arrastar e soltar)");
  }
  return openDemandAction; // fallback
}

// ── Componente principal ──────────────────────────────────────────

export function DropTransitionDialog({ pending, onSuccess, onCancel, allowPastDates = false }: Props) {
  const router = useRouter();
  const open   = !!pending;

  function handleOpenChange(v: boolean) {
    if (!v) onCancel();
  }

  async function afterSuccess() {
    onSuccess();
    router.refresh();
  }

  if (!pending) return null;

  const meta = TRANSITION_META[pending.toStatus];

  // ── EM_ANALISE → ABERTA (devolução para aberta) ───────────────
  if (pending.toStatus === "ABERTA" && pending.fromStatus === "EM_ANALISE") {
    return (
      <SimpleConfirmDialog
        open={open}
        onOpenChange={handleOpenChange}
        pending={pending}
        meta={{ title: "Devolver para aberta", description: "A demanda voltará para o status Aberta.", confirmLabel: "Devolver" }}
        action={returnToOpenAction}
        onSuccess={afterSuccess}
        onCancel={onCancel}
      />
    );
  }

  // ── Simples ──────────────────────────────────────────────────
  if (SIMPLE_TRANSITIONS.has(pending.toStatus)) {
    return (
      <SimpleConfirmDialog
        open={open}
        onOpenChange={handleOpenChange}
        pending={pending}
        meta={meta!}
        action={getSimpleAction(pending.toStatus, pending.fromStatus)}
        onSuccess={afterSuccess}
        onCancel={onCancel}
      />
    );
  }

  // ── EM_ANALISE — retorno simples da diretoria ou coleta de dados ──
  if (pending.toStatus === "EM_ANALISE") {
    if (pending.fromStatus === "PRIORIZACAO_DIRETORIA") {
      return (
        <SimpleConfirmDialog
          open={open}
          onOpenChange={handleOpenChange}
          pending={pending}
          meta={TRANSITION_META["EM_ANALISE"]!}
          action={getSimpleAction(pending.toStatus, pending.fromStatus)}
          onSuccess={afterSuccess}
          onCancel={onCancel}
        />
      );
    }
    return (
      <SendToAnalysisDropDialog
        open={open}
        onOpenChange={handleOpenChange}
        pending={pending}
        onSuccess={afterSuccess}
        onCancel={onCancel}
      />
    );
  }

  // ── EM_DESENVOLVIMENTO — retorno simples ou início com datas ──
  if (pending.toStatus === "EM_DESENVOLVIMENTO") {
    if (RETURN_TO_DEV_FROM.has(pending.fromStatus)) {
      return (
        <SimpleConfirmDialog
          open={open}
          onOpenChange={handleOpenChange}
          pending={pending}
          meta={meta!}
          action={returnToDevelopmentAction}
          onSuccess={afterSuccess}
          onCancel={onCancel}
        />
      );
    }
    return (
      <StartDevelopmentDropDialog
        open={open}
        onOpenChange={handleOpenChange}
        pending={pending}
        allowPastDates={allowPastDates}
        onSuccess={afterSuccess}
        onCancel={onCancel}
      />
    );
  }

  // ── Formulários específicos ───────────────────────────────────
  if (pending.toStatus === "AGUARDANDO_HOMOLOGACAO") {
    return (
      <SendToHomologationDropDialog
        open={open}
        onOpenChange={handleOpenChange}
        pending={pending}
        onSuccess={afterSuccess}
        onCancel={onCancel}
      />
    );
  }

  if (pending.toStatus === "HOMOLOGADA_PRODUCAO") {
    return (
      <HomologateDropDialog
        open={open}
        onOpenChange={handleOpenChange}
        pending={pending}
        onSuccess={afterSuccess}
        onCancel={onCancel}
      />
    );
  }

  if (pending.toStatus === "REPROVADA") {
    return (
      <RejectDropDialog
        open={open}
        onOpenChange={handleOpenChange}
        pending={pending}
        onSuccess={afterSuccess}
        onCancel={onCancel}
      />
    );
  }

  if (pending.toStatus === "CANCELADA") {
    return (
      <CancelDropDialog
        open={open}
        onOpenChange={handleOpenChange}
        pending={pending}
        onSuccess={afterSuccess}
        onCancel={onCancel}
      />
    );
  }

  return null;
}

// ── Confirm simples ───────────────────────────────────────────────

function SimpleConfirmDialog({
  open, onOpenChange, pending, meta, action, onSuccess, onCancel,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pending: PendingDrop;
  meta: TransitionMeta;
  action: SimpleAction;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  async function handleConfirm() {
    setSaving(true);
    setError(null);
    const result = await action(pending.demandId);
    setSaving(false);
    if (!result.success) { setError(result.error ?? "Erro desconhecido"); return; }
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{meta.title}</DialogTitle>
          <DialogDescription>
            <strong className="font-medium text-foreground">&ldquo;{pending.demandTitle}&rdquo;</strong>
            <br />{meta.description}
          </DialogDescription>
        </DialogHeader>
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>Cancelar</Button>
          <Button
            onClick={handleConfirm}
            disabled={saving}
            variant={meta.variant ?? "default"}
            className={meta.confirmClass}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {meta.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Iniciar desenvolvimento (arrastar de APROVADA) ────────────────

function StartDevelopmentDropDialog({
  open, pending, allowPastDates = false, onSuccess, onCancel,
}: { open: boolean; onOpenChange: (v: boolean) => void; pending: PendingDrop; allowPastDates?: boolean; onSuccess: () => void; onCancel: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const form = useForm<StartDevelopmentInput>({
    resolver: zodResolver(startDevelopmentSchema),
    defaultValues: { plannedStartDate: undefined, plannedDeliveryDate: undefined },
  });

  const watchedStart = form.watch("plannedStartDate");
  const minDelivery  = allowPastDates
    ? (watchedStart ? new Date(watchedStart).toISOString().slice(0, 10) : undefined)
    : (watchedStart ? new Date(watchedStart).toISOString().slice(0, 10) : today);

  async function onSubmit(values: StartDevelopmentInput) {
    setError(null);
    const result = await startDevelopmentAction(pending.demandId, values);
    if (!result.success) { setError(result.error ?? "Erro"); return; }
    form.reset();
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { form.reset(); onCancel(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Iniciar desenvolvimento</DialogTitle>
          <DialogDescription>
            <strong className="font-medium text-foreground">&ldquo;{pending.demandTitle}&rdquo;</strong>
            <br />Informe as datas previstas para registrar o início da atividade.
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
              <p className="text-xs text-muted-foreground">Gestor pode definir datas retroativas.</p>
            )}
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onCancel} disabled={form.formState.isSubmitting}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting} className="bg-purple-600 hover:bg-purple-700 text-white">
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

// ── Enviar para homologação ───────────────────────────────────────

type HomolFormValues = z.infer<typeof sendToHomologationSchema>;

function SendToHomologationDropDialog({
  open, pending, onSuccess, onCancel,
}: { open: boolean; onOpenChange: (v: boolean) => void; pending: PendingDrop; onSuccess: () => void; onCancel: () => void }) {
  const [error, setError] = useState<string | null>(null);

  const form = useForm<HomolFormValues>({
    resolver: zodResolver(sendToHomologationSchema),
    defaultValues: { deliveryNotes: "" },
  });

  async function onSubmit(values: HomolFormValues) {
    setError(null);
    const result = await sendToHomologationAction(pending.demandId, values);
    if (!result.success) { setError(result.error ?? "Erro"); return; }
    form.reset();
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { form.reset(); onCancel(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar para homologação</DialogTitle>
          <DialogDescription>
            <strong className="font-medium text-foreground">&ldquo;{pending.demandTitle}&rdquo;</strong>
            <br />Informe a data real de entrega antes de enviar para homologação.
          </DialogDescription>
        </DialogHeader>
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
              name="deliveryNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações da entrega</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o que foi entregue…"
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
              <Button type="button" variant="outline" onClick={onCancel} disabled={form.formState.isSubmitting}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting} className="bg-orange-500 hover:bg-orange-600 text-white">
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

// ── Homologar ─────────────────────────────────────────────────────

type HomologateValues = z.infer<typeof homologateDemandSchema>;

function HomologateDropDialog({
  open, pending, onSuccess, onCancel,
}: { open: boolean; onOpenChange: (v: boolean) => void; pending: PendingDrop; onSuccess: () => void; onCancel: () => void }) {
  const [error, setError] = useState<string | null>(null);

  const form = useForm<HomologateValues>({
    resolver: zodResolver(homologateDemandSchema),
    defaultValues: { homologationNotes: "" },
  });

  async function onSubmit(values: HomologateValues) {
    setError(null);
    const result = await homologateDemandAction(pending.demandId, values);
    if (!result.success) { setError(result.error ?? "Erro"); return; }
    form.reset();
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { form.reset(); onCancel(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Homologar em produção</DialogTitle>
          <DialogDescription>
            <strong className="font-medium text-foreground">&ldquo;{pending.demandTitle}&rdquo;</strong>
            <br />Confirme a homologação. Esta ação não gera pagamento — apenas marca como homologada.
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
                      placeholder="Descreva o resultado da homologação…"
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
              <Button type="button" variant="outline" onClick={onCancel} disabled={form.formState.isSubmitting}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting} className="bg-green-600 hover:bg-green-700 text-white">
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

// ── Reprovar ──────────────────────────────────────────────────────

type RejectValues = z.infer<typeof rejectDemandSchema>;

function RejectDropDialog({
  open, pending, onSuccess, onCancel,
}: { open: boolean; onOpenChange: (v: boolean) => void; pending: PendingDrop; onSuccess: () => void; onCancel: () => void }) {
  const [error, setError] = useState<string | null>(null);

  const form = useForm<RejectValues>({
    resolver: zodResolver(rejectDemandSchema),
    defaultValues: { rejectionReason: "" },
  });

  async function onSubmit(values: RejectValues) {
    setError(null);
    const result = await rejectDemandAction(pending.demandId, values);
    if (!result.success) { setError(result.error ?? "Erro"); return; }
    form.reset();
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { form.reset(); onCancel(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reprovar demanda</DialogTitle>
          <DialogDescription>
            <strong className="font-medium text-foreground">&ldquo;{pending.demandTitle}&rdquo;</strong>
            <br />Informe o motivo. A demanda voltará para revisão pelo desenvolvedor.
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
                      placeholder="Descreva detalhadamente o motivo (mín. 10 caracteres)…"
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
              <Button type="button" variant="outline" onClick={onCancel} disabled={form.formState.isSubmitting}>Cancelar</Button>
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

// ── Enviar para análise (coleta de dados técnicos) ───────────────

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type AnalysisAssignee = { id: string; name: string; role: string; workerProfile: WorkerProfile | null };

const ASSIGNABLE_ROLE_ORDER_DROP = ["DEV", "GESTOR", "ARQUITETO", "SUPORTE", "ADMIN"] as const;
const ASSIGNABLE_ROLE_LABELS_DROP: Record<string, string> = {
  DEV: "Desenvolvedor", GESTOR: "Gestor", ARQUITETO: "Arquiteto", SUPORTE: "Suporte", ADMIN: "Admin",
};

const COMPLEXITY_OPTIONS_DROP = (Object.keys(COMPLEXITY_LABELS) as ComplexityLevel[])
  .map((v) => ({ value: v, label: COMPLEXITY_LABELS[v] }));
const ROI_OPTIONS_DROP = (Object.keys(ROI_LABELS) as RoiLevel[])
  .map((v) => ({ value: v, label: ROI_LABELS[v] }));

function SendToAnalysisDropDialog({
  open, pending, onSuccess, onCancel,
}: { open: boolean; onOpenChange: (v: boolean) => void; pending: PendingDrop; onSuccess: () => void; onCancel: () => void }) {
  const [error, setError]                   = useState<string | null>(null);
  const [assignees, setAssignees]           = useState<AnalysisAssignee[]>([]);
  const [loadingAssignees, setLoadingAssignees] = useState(false);

  const form = useForm<SendToAnalysisInput>({
    resolver: zodResolver(sendToAnalysisSchema),
    defaultValues: { assigneeId: "", estimatedHours: undefined, complexity: undefined, roi: undefined },
  });

  useEffect(() => {
    if (open && assignees.length === 0) {
      setLoadingAssignees(true);
      getAssigneesAction()
        .then((data) => { setAssignees(data as AnalysisAssignee[]); })
        .catch(() => {})
        .finally(() => { setLoadingAssignees(false); });
    }
  }, [open, assignees.length]);

  const watchedAssigneeId = form.watch("assigneeId");
  const watchedHours      = form.watch("estimatedHours");
  const watchedComplexity = form.watch("complexity");
  const watchedRoi        = form.watch("roi");

  const selectedAssignee = assignees.find((a) => a.id === watchedAssigneeId) ?? null;
  const assigneeRole     = selectedAssignee?.role ?? null;
  const workerProfile    = selectedAssignee?.workerProfile ?? null;

  const pricingPreview = (() => {
    if (assigneeRole !== "DEV" || !workerProfile || !watchedHours || !watchedComplexity || !watchedRoi) return null;
    return calculateDemandEstimatedValue({ workerProfile, estimatedHours: watchedHours, complexity: watchedComplexity, roi: watchedRoi });
  })();

  const assigneesByRole = ASSIGNABLE_ROLE_ORDER_DROP.reduce<Record<string, AnalysisAssignee[]>>((acc, role) => {
    const users = assignees.filter((a) => a.role === role);
    if (users.length) acc[role] = users;
    return acc;
  }, {});

  async function onSubmit(values: SendToAnalysisInput) {
    setError(null);
    const result = await sendToAnalysisWithDataAction(pending.demandId, values);
    if (!result.success) { setError(result.error ?? "Erro"); return; }
    form.reset();
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { form.reset(); setError(null); onCancel(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-amber-600" />
            Análise técnica
          </DialogTitle>
          <DialogDescription>
            <strong className="font-medium text-foreground">&ldquo;{pending.demandTitle}&rdquo;</strong>
            <br />Preencha os dados técnicos antes de enviar para análise.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            <FormField
              control={form.control}
              name="assigneeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsável técnico <span className="text-destructive">*</span></FormLabel>
                  <Select disabled={loadingAssignees} onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={loadingAssignees ? "Carregando…" : "Selecionar responsável"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ASSIGNABLE_ROLE_ORDER_DROP.flatMap((role) => {
                        const users = assigneesByRole[role];
                        if (!users?.length) return [];
                        return [
                          <SelectGroup key={role}>
                            <SelectLabel>{ASSIGNABLE_ROLE_LABELS_DROP[role]}</SelectLabel>
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="estimatedHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horas estimadas <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        type="number" min={0.5} step={0.5} placeholder="Ex.: 8"
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
                        <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COMPLEXITY_OPTIONS_DROP.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="roi"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ROI / Impacto estratégico <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ROI_OPTIONS_DROP.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                    <span className="font-medium">Valor estimado (prévia)</span>
                    <span className="font-bold font-mono">{BRL.format(pricingPreview.estimatedValue)}</span>
                  </div>
                )}
              </div>
            )}

            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onCancel} disabled={form.formState.isSubmitting}>
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

// ── Cancelar ──────────────────────────────────────────────────────

type CancelValues = z.infer<typeof cancelDemandSchema>;

function CancelDropDialog({
  open, pending, onSuccess, onCancel,
}: { open: boolean; onOpenChange: (v: boolean) => void; pending: PendingDrop; onSuccess: () => void; onCancel: () => void }) {
  const [error, setError] = useState<string | null>(null);

  const form = useForm<CancelValues>({
    resolver: zodResolver(cancelDemandSchema),
    defaultValues: { cancellationReason: "" },
  });

  async function onSubmit(values: CancelValues) {
    setError(null);
    const result = await cancelDemandAction(pending.demandId, values);
    if (!result.success) { setError(result.error ?? "Erro"); return; }
    form.reset();
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { form.reset(); onCancel(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar demanda</DialogTitle>
          <DialogDescription>
            <strong className="font-medium text-foreground">&ldquo;{pending.demandTitle}&rdquo;</strong>
            <br />Esta ação não pode ser desfeita.
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
                      placeholder="Informe o motivo (mín. 10 caracteres)…"
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
              <Button type="button" variant="outline" onClick={onCancel} disabled={form.formState.isSubmitting}>Voltar</Button>
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
