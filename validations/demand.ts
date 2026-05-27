import { z } from "zod";
import { DemandType, DemandPriority, DemandStatus } from "@prisma/client";

// ── Transições de status permitidas ─────────────────────────────
export const ALLOWED_TRANSITIONS: Record<DemandStatus, DemandStatus[]> = {
  RASCUNHO:              ["ABERTA", "CANCELADA"],
  ABERTA:                ["EM_ANALISE", "CANCELADA"],
  EM_ANALISE:            ["APROVADA", "REPROVADA", "CANCELADA"],
  APROVADA:              ["EM_DESENVOLVIMENTO", "CANCELADA"],
  EM_DESENVOLVIMENTO:    ["AGUARDANDO_HOMOLOGACAO", "CANCELADA"],
  AGUARDANDO_HOMOLOGACAO:["HOMOLOGADA_PRODUCAO", "REPROVADA", "EM_DESENVOLVIMENTO"],
  HOMOLOGADA_PRODUCAO:   ["CONCLUIDA"],
  REPROVADA:             ["EM_DESENVOLVIMENTO", "CANCELADA"],
  CANCELADA:             [],
  CONCLUIDA:             [],
};

// ── Refinamento de datas (reutilizado em create e update) ────────
const deliveryAfterStart = (d: {
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

// ── Schema base (sem refine) — permite .omit / .partial / .extend ─
const createDemandBase = z.object({
  // Bloco 1 — Identificação
  title:          z.string().min(5, "Título deve ter pelo menos 5 caracteres").max(200),
  description:    z.string().min(10, "Descrição deve ter pelo menos 10 caracteres"),
  requesterArea:  z.string().min(2, "Área solicitante é obrigatória"),
  requesterName:  z.string().min(2, "Nome do solicitante é obrigatório"),
  requesterEmail: z.string().email("E-mail inválido").optional().or(z.literal("")).transform(v => v || undefined),
  systemAffected: z.string().max(200).optional(),

  // Bloco 2 — Classificação
  demandType:     z.nativeEnum(DemandType, { required_error: "Tipo é obrigatório" }),
  priority:       z.nativeEnum(DemandPriority).default(DemandPriority.MEDIA),
  estimatedHours: z.coerce.number({ required_error: "Horas estimadas são obrigatórias" })
                   .positive("Horas estimadas devem ser maiores que zero"),
  assigneeId:     z.string().cuid("ID do responsável inválido").optional().nullable(),

  // Bloco 3 — Contexto de negócio
  businessProblem:   z.string().min(10, "Problema de negócio deve ter pelo menos 10 caracteres").optional(),
  expectedResult:    z.string().optional(),
  impactDescription: z.string().optional(),
  dependencies:      z.string().optional(),
  risks:             z.string().optional(),
  observations:      z.string().optional(),

  // Bloco 4 — Prazo
  plannedStartDate:    z.coerce.date().optional().nullable(),
  plannedDeliveryDate: z.coerce.date({ required_error: "Data de entrega é obrigatória" }),

  // Controle interno
  creatorId:    z.string().cuid(),
  saveAsDraft:  z.boolean().default(false),
});

// ── Schema de criação ────────────────────────────────────────────
export const createDemandSchema = createDemandBase.refine(deliveryAfterStart, deliveryMsg);

// ── Schema de atualização ────────────────────────────────────────
export const updateDemandSchema = createDemandBase
  .omit({ creatorId: true, saveAsDraft: true })
  .partial()
  .extend({
    actualStartDate:    z.coerce.date().optional().nullable(),
    actualDeliveryDate: z.coerce.date().optional().nullable(),
    homologationDate:   z.coerce.date().optional().nullable(),
  })
  .refine(deliveryAfterStart, deliveryMsg);

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

// ── Schema de filtros ────────────────────────────────────────────
export const demandFiltersSchema = z.object({
  status:        z.nativeEnum(DemandStatus).optional(),
  priority:      z.nativeEnum(DemandPriority).optional(),
  demandType:    z.nativeEnum(DemandType).optional(),
  assigneeId:    z.string().optional(),
  requesterArea: z.string().optional(),
  search:        z.string().optional(),
  createdFrom:   z.coerce.date().optional(),
  createdTo:     z.coerce.date().optional(),
  deliveryFrom:  z.coerce.date().optional(),
  deliveryTo:    z.coerce.date().optional(),
  page:     z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

// ── Types exportados ─────────────────────────────────────────────
export type CreateDemandInput    = z.infer<typeof createDemandSchema>;
export type UpdateDemandInput    = z.infer<typeof updateDemandSchema>;
export type ChangeDemandStatusInput = z.infer<typeof changeDemandStatusSchema>;
export type UpdateDemandStatusInput = ChangeDemandStatusInput; // alias
export type DemandFiltersInput   = z.infer<typeof demandFiltersSchema>;
