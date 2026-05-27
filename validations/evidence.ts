import { z } from "zod";

export const createEvidenceSchema = z.object({
  demandId: z.string().cuid("ID da demanda inválido"),
  title: z.string().min(3, "Título deve ter ao menos 3 caracteres").max(150),
  url: z.string().url("URL inválida"),
  description: z.string().max(500).optional(),
});

export type CreateEvidenceInput = z.infer<typeof createEvidenceSchema>;
