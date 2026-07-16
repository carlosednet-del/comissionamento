import { z } from "zod";
import type { UserRole, WorkerProfile } from "@prisma/client";

// ── Enum de papéis definido explicitamente ────────────────────────
// Usando z.enum() com valores literais ao invés de z.nativeEnum(UserRole)
// para evitar dependência do objeto de runtime do Prisma Client
// (que pode estar em cache durante hot-reload).
const ALL_ROLES = [
  "ADMIN",
  "DIRETOR",
  "GESTOR",
  "DEV",
  "SUPORTE",
  "ARQUITETO",
  "APROVADOR",
  "FINANCEIRO",
  "SOLICITANTE",
  "DAP",
] as const;

const roleSchema = z.enum(ALL_ROLES);

// workerProfile é obrigatório apenas para papéis técnicos
const ALL_PROFILES = ["JUNIOR", "PLENO", "SENIOR", "ESPECIALISTA"] as const;

const workerProfileRule = z
  .enum(ALL_PROFILES)
  .nullable()
  .optional()
  .transform((v) => (v ?? null) as WorkerProfile | null);

// especialidade técnica opcional (string livre)
const technicalSpecialtyRule = z
  .string()
  .max(100)
  .nullable()
  .optional()
  .transform((v) => (v == null || v === "" ? null : v));

// mínimo garantido e teto são floats positivos opcionais
const positiveFloatRule = z
  .number({ invalid_type_error: "Deve ser um número" })
  .min(0, "Deve ser maior ou igual a 0")
  .nullable()
  .optional()
  .transform((v) => (v === undefined || v === null) ? null : v);

// Papéis que exigem perfil técnico
const TECHNICAL_ROLES = ["DEV", "SUPORTE", "ARQUITETO"] as const;

export const createUserSchema = z
  .object({
    name:               z.string().min(2, "Nome deve ter ao menos 2 caracteres").max(100),
    email:              z.string().email("E-mail inválido"),
    password:           z.string().min(8, "Senha temporária deve ter ao menos 8 caracteres"),
    role:               roleSchema,
    workerProfile:      workerProfileRule,
    monthlyBaseSalary:  positiveFloatRule,
    monthlyCapValue:    positiveFloatRule,
    technicalSpecialty: technicalSpecialtyRule,
    isActive:           z.boolean().optional().default(true),
  })
  .refine(
    (data) => {
      if ((TECHNICAL_ROLES as readonly string[]).includes(data.role) && !data.workerProfile) return false;
      return true;
    },
    { message: "Perfil técnico é obrigatório para papéis técnicos (Dev, Suporte, Arquiteto)", path: ["workerProfile"] },
  );

export const updateUserSchema = z
  .object({
    name:               z.string().min(2, "Nome deve ter ao menos 2 caracteres").max(100),
    role:               roleSchema,
    workerProfile:      workerProfileRule,
    monthlyBaseSalary:  positiveFloatRule,
    monthlyCapValue:    positiveFloatRule,
    technicalSpecialty: technicalSpecialtyRule,
    isActive:           z.boolean().optional(),
    useEntraId:         z.boolean().optional().default(false),
  })
  .refine(
    (data) => {
      if ((TECHNICAL_ROLES as readonly string[]).includes(data.role) && !data.workerProfile) return false;
      return true;
    },
    { message: "Perfil técnico é obrigatório para papéis técnicos (Dev, Suporte, Arquiteto)", path: ["workerProfile"] },
  );

export type CreateUserInput = z.infer<typeof createUserSchema> & { role: UserRole };
export type UpdateUserInput = z.infer<typeof updateUserSchema> & { role: UserRole };
