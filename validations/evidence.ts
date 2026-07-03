import { z } from "zod";

export const createEvidenceSchema = z.object({
  demandId:    z.string().min(1, "ID da demanda inválido"),
  title:       z.string().min(3, "Título deve ter pelo menos 3 caracteres").max(150),
  url:         z.string().url("URL inválida").refine(
    (u) => /^https?:\/\//i.test(u),
    "Apenas URLs http ou https são permitidas",
  ),
  description: z.string().max(500).optional(),
  createdById: z.string().min(1).optional().nullable(),
});

export type CreateEvidenceInput = z.infer<typeof createEvidenceSchema>;
