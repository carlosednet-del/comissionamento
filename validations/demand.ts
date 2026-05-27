import { z } from "zod";
import { DemandType, DemandPriority, DemandStatus } from "@prisma/client";

export const createDemandSchema = z.object({
  title: z.string().min(5, "Título deve ter ao menos 5 caracteres").max(200),
  description: z.string().min(10, "Descrição deve ter ao menos 10 caracteres"),
  requesterArea: z.string().min(2, "Área solicitante é obrigatória"),
  requesterName: z.string().min(2, "Nome do solicitante é obrigatório"),
  demandType: z.nativeEnum(DemandType),
  priority: z.nativeEnum(DemandPriority).optional().default(DemandPriority.MEDIA),
  systemAffected: z.string().optional(),
  estimatedHours: z.number().positive("Horas estimadas devem ser positivas").optional(),
  plannedDeliveryDate: z.coerce.date().optional(),
  assigneeId: z.string().cuid("ID do responsável inválido").optional(),
  creatorId: z.string().cuid("ID do criador inválido"),
});

export const updateDemandSchema = createDemandSchema
  .omit({ creatorId: true })
  .partial()
  .extend({
    actualDeliveryDate: z.coerce.date().optional(),
    homologationDate: z.coerce.date().optional(),
  });

// Mapeamento de transições de status permitidas
const ALLOWED_TRANSITIONS: Record<DemandStatus, DemandStatus[]> = {
  RASCUNHO: ["ABERTA", "CANCELADA"],
  ABERTA: ["EM_ANALISE", "CANCELADA"],
  EM_ANALISE: ["APROVADA", "REPROVADA", "CANCELADA"],
  APROVADA: ["EM_DESENVOLVIMENTO", "CANCELADA"],
  EM_DESENVOLVIMENTO: ["AGUARDANDO_HOMOLOGACAO", "CANCELADA"],
  AGUARDANDO_HOMOLOGACAO: ["HOMOLOGADA_PRODUCAO", "REPROVADA", "EM_DESENVOLVIMENTO"],
  HOMOLOGADA_PRODUCAO: ["CONCLUIDA"],
  REPROVADA: ["EM_DESENVOLVIMENTO", "CANCELADA"],
  CANCELADA: [],
  CONCLUIDA: [],
};

export const updateDemandStatusSchema = z
  .object({
    currentStatus: z.nativeEnum(DemandStatus),
    newStatus: z.nativeEnum(DemandStatus),
    reason: z.string().min(5, "Motivo deve ter ao menos 5 caracteres").optional(),
  })
  .refine(
    ({ currentStatus, newStatus }) => {
      return ALLOWED_TRANSITIONS[currentStatus]?.includes(newStatus);
    },
    ({ currentStatus, newStatus }) => ({
      message: `Transição de ${currentStatus} para ${newStatus} não é permitida`,
      path: ["newStatus"],
    }),
  );

export { ALLOWED_TRANSITIONS };

export type CreateDemandInput = z.infer<typeof createDemandSchema>;
export type UpdateDemandInput = z.infer<typeof updateDemandSchema>;
export type UpdateDemandStatusInput = z.infer<typeof updateDemandStatusSchema>;
