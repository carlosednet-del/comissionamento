"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { DemandType, DemandPriority } from "@prisma/client";
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
import { Loader2, Save, Send } from "lucide-react";
import { cn } from "@/lib/utils";

// ── helpers ─────────────────────────────────────────────────────────
function toDateInput(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

// ── Textarea ─────────────────────────────────────────────────────────
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

// ── Tipos ─────────────────────────────────────────────────────────────
type Assignee = { id: string; name: string };

type CreateMode = { mode: "create"; assignees: Assignee[] };
type EditMode   = { mode: "edit"; demand: DemandWithRelations; assignees: Assignee[] };
type Props = CreateMode | EditMode;

// ── Opções ────────────────────────────────────────────────────────────
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

const NONE_ASSIGNEE = "__NONE__";

// ── Componente ────────────────────────────────────────────────────────
export function DemandForm(props: Props) {
  const router   = useRouter();
  const isCreate = props.mode === "create";
  const demand   = !isCreate ? (props as EditMode).demand : null;

  const [serverError, setServerError] = useState<string | null>(null);

  type FormValues = CreateDemandInput | UpdateDemandInput;

  const defaultValues: Partial<FormValues> = isCreate
    ? {
        title: "", description: "", requesterArea: "", requesterName: "",
        requesterEmail: "", systemAffected: "",
        demandType: undefined, priority: "MEDIA",
        estimatedHours: undefined, assigneeId: null,
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
        systemAffected:      demand?.systemAffected ?? "",
        demandType:          demand?.demandType,
        priority:            demand?.priority ?? "MEDIA",
        estimatedHours:      demand?.estimatedHours ?? undefined,
        assigneeId:          demand?.assigneeId ?? null,
        businessProblem:     demand?.businessProblem ?? "",
        expectedResult:      demand?.expectedResult ?? "",
        impactDescription:   demand?.impactDescription ?? "",
        dependencies:        demand?.dependencies ?? "",
        risks:                demand?.risks ?? "",
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

  async function submit(values: FormValues, draft = false) {
    setServerError(null);

    if (isCreate) {
      const payload = { ...(values as CreateDemandInput), saveAsDraft: draft };
      const result  = await createDemandAction(payload);
      if (!result.success) { setServerError(result.error); return; }
      router.push(`/demandas/${result.data.id}`);
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

        {/* ── Bloco 1 — Identificação ─────────────────────────────── */}
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

              <FormField
                control={form.control}
                name="systemAffected"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sistema afetado</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex.: ERP, Portal Web…" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Bloco 2 — Classificação ─────────────────────────────── */}
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
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assigneeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v === NONE_ASSIGNEE ? null : v)}
                      defaultValue={field.value ?? NONE_ASSIGNEE}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sem responsável" />
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
          </CardContent>
        </Card>

        {/* ── Bloco 3 — Contexto de negócio ───────────────────────── */}
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

        {/* ── Bloco 4 — Prazo ─────────────────────────────────────── */}
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

        {/* ── Ações ────────────────────────────────────────────────── */}
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
