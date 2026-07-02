import { z } from "zod";
import { DemandType, DemandPriority, DemandStatus, ComplexityLevel, RoiLevel } from "@prisma/client";

// ── Transições de status permitidas ─────────────────────────────
export const ALLOWED_TRANSITIONS: Record<DemandStatus, DemandStatus[]> = {
  RASCUNHO:               ["ABERTA", "CANCELADA"],
  ABERTA:                 ["EM_ANALISE", "CANCELADA"],
  EM_ANALISE:             ["PRIORIZACAO_DIRETORIA", "REPROVADA", "CANCELADA"],
  PRIORIZACAO_DIRETORIA:  ["APROVADA", "EM_ANALISE", "CANCELADA"],
  APROVADA:               ["EM_DESENVOLVIMENTO", "CANCELADA"],
  EM_DESENVOLVIMENTO:     ["AGUARDANDO_HOMOLOGACAO", "CANCELADA"],
  AGUARDANDO_HOMOLOGACAO: ["HOMOLOGADA_PRODUCAO", "REPROVADA", "EM_DESENVOLVIMENTO"],
  HOMOLOGADA_PRODUCAO:    ["CONCLUIDA"],
  REPROVADA:              ["EM_DESENVOLVIMENTO", "CANCELADA"],
  CANCELADA:              [],
  CONCLUIDA:              [],
};

// ── Refinamento de datas ─────────────────────────────────────────
const dateDeliveryAfterStart = (d: {
  plannedStartDate?:    Date | null;
  plannedDeliveryDate?: Date | null;
}) => {
  if (!d.plannedStartDate || !d.plannedDeliveryDate) return true;
  return d.plannedDeliveryDate >= d.plannedStartDate;
};

const deliveryMsg = {
  message: "Data de entrega não pode ser anterior à data de início",
  path: ["plannedDeliveryDate"],
};

// ── Preprocess para número opcional ──────────────────────────────
const optionalPositiveNumber = z.preprocess(
  (v) =>
    v === "" || v === null || v === undefined || (typeof v === "number" && isNaN(v))
      ? undefined
      : Number(v),
  z.number().positive("Horas estimadas devem ser maiores que zero").optional(),
);

// ── Schema base (sem refine) — suporta .omit / .partial / .extend ─
const createDemandBase = z.object({
  // Bloco 1 — Identificação
  title:          z.string().trim().min(5, "Título deve ter pelo menos 5 caracteres").max(200),
  description:    z.string().trim().min(10, "Descrição deve ter pelo menos 10 caracteres"),
  requesterArea:  z.string().min(2, "Área solicitante é obrigatória"),
  requesterName:  z.string().trim().min(2, "Nome do solicitante é obrigatório"),
  requesterEmail: z.string().email("E-mail inválido").optional().or(z.literal("")).transform(v => v || undefined),

  // Bloco 2 — Classificação
  demandType: z.nativeEnum(DemandType, { required_error: "Tipo é obrigatório" }),
  priority:   z.nativeEnum(DemandPriority).default(DemandPriority.MEDIA),

  // Bloco 3 — Execução técnica (validado manualmente no form/service para não-rascunho)
  assigneeId:     z.string().min(1, "ID do responsável inválido").optional().nullable(),
  estimatedHours: optionalPositiveNumber,
  complexity:     z.nativeEnum(ComplexityLevel).optional().nullable(),
  roi:            z.nativeEnum(RoiLevel).optional().nullable(),

  // Bloco 3b — Sistema(s) afetado(s) (required para não-rascunho)
  systemAffected: z.string().trim().optional(),

  // Bloco 4 — Contexto de negócio (required para não-rascunho via superRefine)
  businessProblem:   z.string().trim().optional(),
  expectedResult:    z.string().trim().optional(),
  impactDescription: z.string().trim().optional(),
  dependencies:      z.string().trim().optional(),
  risks:             z.string().trim().optional(),
  observations:      z.string().trim().optional(),

  // Bloco 4b — Critérios de aceite (required para não-rascunho via superRefine)
  acceptanceCriteria: z.string().trim().optional(),
  expectedEvidence:   z.string().trim().optional(),

  // Bloco 5 — Prazo (preenchido pelo Gestor na análise)
  plannedStartDate:    z.coerce.date().optional().nullable(),
  plannedDeliveryDate: z.coerce.date().optional().nullable(),

  // Controle interno
  // creatorId é opcional no schema do formulário — o server action injeta o valor real.
  creatorId:   z.string().min(1).optional(),
  saveAsDraft: z.boolean().default(false),
});

// ── Helper interno de validação de contexto ───────────────────────
function addContextIssue(ctx: z.RefinementCtx, value: string | undefined | null, minLen: number, message: string, path: string) {
  const trimmed = (value ?? "").trim();
  if (trimmed.length < minLen) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: [path] });
  }
}

// ── Schema de criação ─────────────────────────────────────────────
// • Rascunho (saveAsDraft=true): valida apenas estrutura básica e datas.
// • Demanda aberta (saveAsDraft=false): exige todos os campos de contexto
//   e e-mail do solicitante. Campos de execução técnica (assigneeId, horas,
//   complexidade, ROI) são validados manualmente no form e no service,
//   pois dependem do papel do usuário (canEditAnalysis).
export const createDemandSchema = createDemandBase.superRefine((data, ctx) => {
  // Validação de datas (sempre)
  if (data.plannedStartDate && data.plannedDeliveryDate) {
    if (data.plannedDeliveryDate < data.plannedStartDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Data de entrega não pode ser anterior à data de início",
        path: ["plannedDeliveryDate"],
      });
    }
  }

  // Validação completa — apenas para demandas abertas (não-rascunho)
  if (!data.saveAsDraft) {
    if (!data.requesterEmail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "E-mail do solicitante é obrigatório",
        path: ["requesterEmail"],
      });
    }

    addContextIssue(ctx, data.systemAffected,     3, "Informe o(s) sistema(s) afetado(s) por esta demanda.",                                      "systemAffected");
    addContextIssue(ctx, data.businessProblem,   10, "Informe o problema ou oportunidade que motivou esta demanda.",                              "businessProblem");
    addContextIssue(ctx, data.expectedResult,    10, "Informe o resultado esperado ao concluir esta demanda.",                                    "expectedResult");
    addContextIssue(ctx, data.impactDescription,  5, "Informe quais áreas, processos ou indicadores serão impactados.",                           "impactDescription");
    addContextIssue(ctx, data.dependencies,       3, "Informe as dependências da demanda. Se não houver, preencha 'Não há dependências'.",         "dependencies");
    addContextIssue(ctx, data.risks,              3, "Informe os riscos identificados. Se não houver, preencha 'Não há riscos'.",                  "risks");
    addContextIssue(ctx, data.observations,       3, "Informe observações relevantes. Se não houver, preencha 'Não há observações'.",              "observations");
    addContextIssue(ctx, data.acceptanceCriteria,10, "Informe os critérios de aceite (o que deve ser verdadeiro para a demanda ser considerada concluída).", "acceptanceCriteria");
    addContextIssue(ctx, data.expectedEvidence,   5, "Informe as evidências esperadas (prints, dados, logs) para validar a conclusão.",           "expectedEvidence");
  }
});

// ── Schema de atualização ────────────────────────────────────────
export const updateDemandSchema = createDemandBase
  .omit({ creatorId: true, saveAsDraft: true })
  .partial()
  .extend({
    actualStartDate:    z.coerce.date().optional().nullable(),
    actualDeliveryDate: z.coerce.date().optional().nullable(),
    homologationDate:   z.coerce.date().optional().nullable(),
  })
  .refine(dateDeliveryAfterStart, deliveryMsg);

// ── Schema de alteração de status ────────────────────────────────
export const changeDemandStatusSchema = z
  .object({
    currentStatus: z.nativeEnum(DemandStatus),
    newStatus:     z.nativeEnum(DemandStatus),
    reason:        z.string().min(5, "Motivo deve ter ao menos 5 caracteres").optional(),
  })
  .refine(
    ({ currentStatus, newStatus }) =>
      ALLOWED_TRANSITIONS[currentStatus]?.includes(newStatus),
    ({ currentStatus, newStatus }) => ({
      message: `Transição de "${currentStatus}" para "${newStatus}" não é permitida`,
      path: ["newStatus"],
    }),
  );

// Alias para compatibilidade com código legado do Módulo 1
export const updateDemandStatusSchema = changeDemandStatusSchema;

// ── Schema de envio para homologação ─────────────────────────────
export const sendToHomologationSchema = z.object({
  actualDeliveryDate: z.coerce.date({ required_error: "Data real de entrega é obrigatória" }),
  deliveryNotes:      z.string().optional(),
});

// ── Schema de homologação em produção ─────────────────────────────
export const homologateDemandSchema = z.object({
  homologationNotes: z.string().optional(),
});

// ── Schema de reprovação ──────────────────────────────────────────
export const rejectDemandSchema = z.object({
  rejectionReason: z
    .string()
    .min(10, "Motivo da reprovação deve ter ao menos 10 caracteres"),
});

// ── Schema de cancelamento ────────────────────────────────────────
export const cancelDemandSchema = z.object({
  cancellationReason: z
    .string()
    .min(10, "Motivo do cancelamento deve ter ao menos 10 caracteres"),
});

// ── Schema de início de desenvolvimento ──────────────────────────
export const startDevelopmentSchema = z.object({
  plannedStartDate:    z.coerce.date({ required_error: "Data de início previsto é obrigatória" }),
  plannedDeliveryDate: z.coerce.date({ required_error: "Data de entrega prevista é obrigatória" }),
}).refine(
  (d) => d.plannedDeliveryDate >= d.plannedStartDate,
  { message: "Data de entrega não pode ser anterior à data de início", path: ["plannedDeliveryDate"] },
);

// ── Schema de filtros do kanban ──────────────────────────────────
export const kanbanFiltersSchema = z.object({
  search:        z.string().optional(),
  statuses:      z.array(z.nativeEnum(DemandStatus)).optional(),
  priority:      z.nativeEnum(DemandPriority).optional(),
  demandType:    z.nativeEnum(DemandType).optional(),
  assigneeId:    z.string().optional(),
  requesterArea: z.string().optional(),
  requesterName: z.string().optional(),
  director:      z.string().optional(),
  complexity:    z.nativeEnum(ComplexityLevel).optional(),
  roi:           z.nativeEnum(RoiLevel).optional(),
  deadlineStatus: z.enum(["overdue", "today", "soon", "ok"]).optional(),
  deliveryFrom:  z.coerce.date().optional(),
  deliveryTo:    z.coerce.date().optional(),
  onlyMine:      z.coerce.boolean().default(false),
  sortBy:        z.enum(["priority", "deadline", "created", "title"]).default("priority"),
});

// ── Schema de filtros ────────────────────────────────────────────
export const demandFiltersSchema = z.object({
  status:        z.nativeEnum(DemandStatus).optional(),
  priority:      z.nativeEnum(DemandPriority).optional(),
  demandType:    z.nativeEnum(DemandType).optional(),
  assigneeId:    z.string().optional(),
  requesterArea: z.string().optional(),
  director:      z.string().optional(),
  search:        z.string().optional(),
  createdFrom:   z.coerce.date().optional(),
  createdTo:     z.coerce.date().optional(),
  deliveryFrom:  z.coerce.date().optional(),
  deliveryTo:    z.coerce.date().optional(),
  page:     z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

// ── Types exportados ─────────────────────────────────────────────
export type CreateDemandInput          = z.infer<typeof createDemandSchema>;
export type UpdateDemandInput          = z.infer<typeof updateDemandSchema>;
export type ChangeDemandStatusInput    = z.infer<typeof changeDemandStatusSchema>;
export type UpdateDemandStatusInput    = ChangeDemandStatusInput; // alias
export type DemandFiltersInput         = z.infer<typeof demandFiltersSchema>;
export type SendToHomologationInput    = z.infer<typeof sendToHomologationSchema>;
export type HomologateDemandInput      = z.infer<typeof homologateDemandSchema>;
export type RejectDemandInput          = z.infer<typeof rejectDemandSchema>;
export type CancelDemandInput          = z.infer<typeof cancelDemandSchema>;
export type KanbanFiltersInput         = z.infer<typeof kanbanFiltersSchema>;
export type StartDevelopmentInput      = z.infer<typeof startDevelopmentSchema>;
