"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { DemandType, DemandPriority, ComplexityLevel, RoiLevel, WorkerProfile } from "@prisma/client";
import {
  createDemandSchema,
  updateDemandSchema,
  type CreateDemandInput,
  type UpdateDemandInput,
} from "@/validations/demand";
import type { DemandWithRelations } from "@/types";
import { createDemandAction, updateDemandAction } from "@/server/actions/demandActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, Send, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  HOURLY_RATES,
  WORKER_PROFILE_LABELS,
  COMPLEXITY_LABELS,
  ROI_LABELS,
  calculateDemandEstimatedValue,
} from "@/lib/demand-pricing";

// ── Formatação ───────────────────────────────────────────────────────────────
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function toDateInput(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

// ── Textarea ─────────────────────────────────────────────────────────────────
function Textarea({
  className,
  rows = 3,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { rows?: number }) {
  return (
    <textarea
      rows={rows}
      className={cn(
        "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
        "ring-offset-background placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50 resize-none",
        className,
      )}
      {...props}
    />
  );
}

// ── Tipos ─────────────────────────────────────────────────────────────────────
type Assignee = { id: string; name: string; workerProfile: WorkerProfile | null };

type CreateMode = { mode: "create"; assignees: Assignee[] };
type EditMode   = { mode: "edit"; demand: DemandWithRelations; assignees: Assignee[] };
type Props = CreateMode | EditMode;

// ── Opções ────────────────────────────────────────────────────────────────────
const DEMAND_TYPE_OPTIONS: { value: DemandType; label: string }[] = [
  { value: "NOVA_SOLUCAO",      label: "Nova solução" },
  { value: "EVOLUCAO_PRODUCAO", label: "Evolução de produção" },
  { value: "CORRECAO",          label: "Correção" },
  { value: "AUTOMACAO",         label: "Automação" },
  { value: "DASHBOARD",         label: "Dashboard" },
  { value: "INTEGRACAO",        label: "Integração" },
  { value: "OUTRO",             label: "Outro" },
];

const PRIORITY_OPTIONS: { value: DemandPriority; label: string }[] = [
  { value: "BAIXA",   label: "Baixa" },
  { value: "MEDIA",   label: "Média" },
  { value: "ALTA",    label: "Alta" },
  { value: "CRITICA", label: "Crítica" },
];

const COMPLEXITY_OPTIONS: { value: ComplexityLevel; label: string }[] = (
  Object.keys(COMPLEXITY_LABELS) as ComplexityLevel[]
).map((v) => ({ value: v, label: COMPLEXITY_LABELS[v] }));

const ROI_OPTIONS: { value: RoiLevel; label: string }[] = (
  Object.keys(ROI_LABELS) as RoiLevel[]
).map((v) => ({ value: v, label: ROI_LABELS[v] }));

const NONE_ASSIGNEE = "__NONE__";

// ── Prévia de pricing ─────────────────────────────────────────────────────────
function PricingPreview({
  workerProfile,
  estimatedHours,
  complexity,
  roi,
}: {
  workerProfile:  WorkerProfile | null | undefined;
  estimatedHours: number | null | undefined;
  complexity:     ComplexityLevel | null | undefined;
  roi:            RoiLevel | null | undefined;
}) {
  const result = useMemo(() => {
    if (!workerProfile || !estimatedHours || !complexity || !roi) return null;
    return calculateDemandEstimatedValue({ workerProfile, estimatedHours, complexity, roi });
  }, [workerProfile, estimatedHours, complexity, roi]);

  if (!result) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
        Preencha responsável, horas, complexidade e ROI para ver a prévia do valor estimado.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-brand-accent/40 bg-brand-bg-base p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-text-muted">
        Prévia do valor estimado
      </p>

      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Valor/hora</span>
          <span className="font-mono">{BRL.format(result.hourlyRate)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Horas estimadas</span>
          <span className="font-mono">{result.estimatedHours}h</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            Fator ({COMPLEXITY_LABELS[complexity!]} / {ROI_LABELS[roi!]})
          </span>
          <span className="font-mono">{result.combinedFactor.toFixed(1)}×</span>
        </div>

        <div className="border-t pt-2 flex justify-between items-center">
          <span className="font-semibold text-brand-text-dark">Valor estimado</span>
          <span className="font-bold text-lg text-brand-text-dark font-mono">
            {BRL.format(result.estimatedValue)}
          </span>
        </div>
      </div>

      <div className="flex gap-1.5 rounded-md bg-amber-50 border border-amber-200 p-2.5">
        <Info className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-700">
          Este valor é uma prévia. O cálculo final será confirmado pelo sistema no momento do registro.
        </p>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export function DemandForm(props: Props) {
  const router   = useRouter();
  const isCreate = props.mode === "create";
  const demand   = !isCreate ? (props as EditMode).demand : null;

  const [serverError, setServerError] = useState<string | null>(null);

  type FormValues = CreateDemandInput | UpdateDemandInput;

  const defaultValues: Partial<FormValues> = isCreate
    ? {
        title: "", description: "", requesterArea: "", requesterName: "",
        requesterEmail: "",
        demandType: undefined, priority: "MEDIA",
        assigneeId: null, estimatedHours: undefined,
        complexity: null, roi: null,
        businessProblem: "", expectedResult: "", impactDescription: "",
        dependencies: "", risks: "", observations: "",
        plannedStartDate: null, plannedDeliveryDate: undefined,
        saveAsDraft: false,
      }
    : {
        title:               demand?.title ?? "",
        description:         demand?.description ?? "",
        requesterArea:       demand?.requesterArea ?? "",
        requesterName:       demand?.requesterName ?? "",
        requesterEmail:      demand?.requesterEmail ?? "",
        demandType:          demand?.demandType,
        priority:            demand?.priority ?? "MEDIA",
        assigneeId:          demand?.assigneeId ?? null,
        estimatedHours:      demand?.estimatedHours ?? undefined,
        complexity:          demand?.complexity ?? null,
        roi:                 demand?.roi ?? null,
        businessProblem:     demand?.businessProblem ?? "",
        expectedResult:      demand?.expectedResult ?? "",
        impactDescription:   demand?.impactDescription ?? "",
        dependencies:        demand?.dependencies ?? "",
        risks:               demand?.risks ?? "",
        observations:        demand?.observations ?? "",
        plannedStartDate:    demand?.plannedStartDate ?? null,
        plannedDeliveryDate: demand?.plannedDeliveryDate ?? undefined,
        actualStartDate:     demand?.actualStartDate ?? null,
        actualDeliveryDate:  demand?.actualDeliveryDate ?? null,
      };

  const form = useForm<FormValues>({
    resolver: zodResolver(isCreate ? createDemandSchema : updateDemandSchema) as never,
    defaultValues: defaultValues as never,
  });

  // ── Derived state for execution block ──
  const watchedAssigneeId = form.watch("assigneeId" as never) as unknown as string | null | undefined;
  const watchedHours      = form.watch("estimatedHours" as never) as unknown as number | undefined;
  const watchedComplexity = form.watch("complexity" as never) as unknown as ComplexityLevel | null | undefined;
  const watchedRoi        = form.watch("roi" as never) as unknown as RoiLevel | null | undefined;

  const selectedAssignee  = props.assignees.find((a) => a.id === watchedAssigneeId) ?? null;
  const workerProfile     = selectedAssignee?.workerProfile ?? null;
  const profileLabel      = workerProfile ? WORKER_PROFILE_LABELS[workerProfile] : "—";
  const hourlyRateDisplay = workerProfile ? BRL.format(HOURLY_RATES[workerProfile]) : "—";

  async function submit(values: FormValues, draft = false) {
    setServerError(null);

    // ── Validação manual dos campos obrigatórios para demanda (não-rascunho) ──
    if (!draft && isCreate) {
      const v = values as CreateDemandInput;
      let hasError = false;

      if (!v.assigneeId) {
        form.setError("assigneeId" as never, { message: "Responsável técnico é obrigatório para criar a demanda" });
        hasError = true;
      }
      if (!v.estimatedHours) {
        form.setError("estimatedHours" as never, { message: "Horas estimadas são obrigatórias" });
        hasError = true;
      }
      if (!v.complexity) {
        form.setError("complexity" as never, { message: "Complexidade é obrigatória" });
        hasError = true;
      }
      if (!v.roi) {
        form.setError("roi" as never, { message: "ROI / Impacto estratégico é obrigatório" });
        hasError = true;
      }

      if (hasError) return;
    }

    if (isCreate) {
      const payload = { ...(values as CreateDemandInput), saveAsDraft: draft };
      const result  = await createDemandAction(payload);
      if (!result.success) { setServerError(result.error); return; }
      router.push("/demandas");
    } else {
      const result = await updateDemandAction((props as EditMode).demand.id, values as UpdateDemandInput);
      if (!result.success) { setServerError(result.error); return; }
      router.push(`/demandas/${(props as EditMode).demand.id}`);
    }

    router.refresh();
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((v) => submit(v, false))}
        className="space-y-6"
      >
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        {/* ── Bloco 1 — Identificação ──────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Identificação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Descreva brevemente a demanda" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva a demanda em detalhes"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="requesterArea"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Área solicitante <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Ex.: Financeiro, Operações…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requesterName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Solicitante <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do solicitante" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requesterEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail do solicitante</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="solicitante@empresa.com" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </div>
          </CardContent>
        </Card>

        {/* ── Bloco 2 — Classificação ──────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Classificação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="demandType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DEMAND_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a prioridade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRIORITY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Bloco 3 — Execução técnica ───────────────────────────────── */}
        <Card className="card-accent-top">
          <CardHeader className="card-header-gradient">
            <CardTitle className="text-base text-brand-text-dark">Execução técnica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Row 1 — Responsável + campos derivados (readonly) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="lg:col-span-2">
                <FormField
                  control={form.control}
                  name={"assigneeId" as never}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Responsável técnico{!isCreate && <span className="text-destructive ml-1">*</span>}
                      </FormLabel>
                      <Select
                        onValueChange={(v) => {
                          field.onChange(v === NONE_ASSIGNEE ? null : v);
                        }}
                        value={(field as { value: string | null }).value ?? NONE_ASSIGNEE}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar responsável" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NONE_ASSIGNEE}>Sem responsável</SelectItem>
                          {props.assignees.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Perfil técnico — derivado do responsável, readonly (sem FormField) */}
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Perfil técnico
                </label>
                <Input
                  readOnly
                  tabIndex={-1}
                  value={profileLabel}
                  className="bg-muted/60 text-muted-foreground cursor-default select-none"
                />
              </div>

              {/* Valor/hora — derivado do responsável, readonly (sem FormField) */}
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Valor / hora
                </label>
                <Input
                  readOnly
                  tabIndex={-1}
                  value={hourlyRateDisplay}
                  className="bg-muted/60 text-muted-foreground cursor-default select-none font-mono"
                />
              </div>
            </div>

            {/* Row 2 — Horas, Complexidade, ROI */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name={"estimatedHours" as never}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horas estimadas</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0.5}
                        step={0.5}
                        placeholder="Ex.: 8"
                        value={(field as { value: number | undefined }).value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === "" ? undefined : e.target.valueAsNumber,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={"complexity" as never}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Complexidade</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={(field as { value: ComplexityLevel | null }).value ?? ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COMPLEXITY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={"roi" as never}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ROI / Impacto estratégico</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={(field as { value: RoiLevel | null }).value ?? ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ROI_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Prévia de valor estimado */}
            <PricingPreview
              workerProfile={workerProfile}
              estimatedHours={watchedHours}
              complexity={watchedComplexity}
              roi={watchedRoi}
            />
          </CardContent>
        </Card>

        {/* ── Bloco 4 — Contexto de negócio ───────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contexto de negócio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="businessProblem"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Problema de negócio</FormLabel>
                  <FormDescription>Qual problema ou oportunidade motivou esta demanda?</FormDescription>
                  <FormControl>
                    <Textarea rows={3} placeholder="Descreva o problema…" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expectedResult"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resultado esperado</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="O que se espera ao concluir esta demanda?" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="impactDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Impacto</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="Quais áreas / processos serão impactados?" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dependencies"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dependências</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="Há dependências de outros sistemas ou times?" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="risks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Riscos</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="Quais riscos foram identificados?" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="observations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="Alguma informação adicional relevante?" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Bloco 5 — Prazo ──────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Prazo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="plannedStartDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início previsto</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={toDateInput(field.value)}
                        onChange={(e) =>
                          field.onChange(e.target.value ? new Date(e.target.value) : null)
                        }
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
                        value={toDateInput(field.value)}
                        onChange={(e) =>
                          field.onChange(e.target.value ? new Date(e.target.value) : null)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campos de realização — apenas em edição */}
              {!isCreate && (
                <>
                  <FormField
                    control={form.control}
                    name={"actualStartDate" as never}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Início real</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            value={toDateInput((field as { value: Date | null }).value)}
                            onChange={(e) =>
                              field.onChange(e.target.value ? new Date(e.target.value) : null)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={"actualDeliveryDate" as never}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Entrega real</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            value={toDateInput((field as { value: Date | null }).value)}
                            onChange={(e) =>
                              field.onChange(e.target.value ? new Date(e.target.value) : null)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Ações ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3">
          {isCreate && (
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={form.handleSubmit((v) => submit(v, true))}
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar rascunho
            </Button>
          )}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {isCreate ? "Criar demanda" : "Salvar alterações"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            disabled={isSubmitting}
            onClick={() => router.back()}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </Form>
  );
}
