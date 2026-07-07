import { z } from "zod";

export const executiveDashboardFiltersSchema = z.object({
  startDate:       z.string().optional(),
  endDate:         z.string().optional(),
  collaboratorId:  z.string().optional(),
  requesterArea:   z.string().optional(),
  directorId:      z.string().optional(),
  workerProfile:   z.enum(["JUNIOR", "PLENO", "SENIOR", "ESPECIALISTA"]).optional(),
  specialty:       z.string().optional(), // livre ou "SEM_ESPECIALIDADE"
  demandType:      z.enum(["NOVA_SOLUCAO", "EVOLUCAO_PRODUCAO", "CORRECAO", "AUTOMACAO", "DASHBOARD", "INTEGRACAO", "OUTRO"]).optional(),
  complexity:      z.enum(["BAIXA", "MEDIA", "ALTA", "CRITICA"]).optional(),
  roi:             z.enum(["BAIXO", "MEDIO", "ALTO", "ESTRATEGICO"]).optional(),
  homologatedOnly: z.boolean().default(true),
});

export type ExecutiveDashboardFilters = z.infer<typeof executiveDashboardFiltersSchema>;
