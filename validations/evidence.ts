import { z } from "zod";

export const createEvidenceSchema = z.object({
  demandId:    z.string().min(1, "ID da demanda inválido"),
  title:       z.string().min(3, "Título deve ter pelo menos 3 caracteres").max(150),
  // Aceita URL externa http(s) (modo link) ou o caminho interno da imagem
  // salva no banco (modo imagem, servida por /api/evidence/[id]).
  url:         z.string().refine(
    (u) => /^https?:\/\//i.test(u) || /^\/api\/evidence\/[\w-]+$/.test(u),
    "URL inválida",
  ),
  description: z.string().max(500).optional(),
  createdById: z.string().min(1).optional().nullable(),
});

export type CreateEvidenceInput = z.infer<typeof createEvidenceSchema>;
