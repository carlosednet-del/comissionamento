import { z } from "zod";
import { UserRole, WorkerProfile } from "@prisma/client";

// workerProfile é obrigatório apenas para papéis técnicos
const workerProfileRule = z
  .nativeEnum(WorkerProfile)
  .nullable()
  .optional()
  .transform((v) => v ?? null);

// salário e teto são floats positivos opcionais
const positiveFloatRule = z
  .number({ invalid_type_error: "Deve ser um número" })
  .min(0, "Deve ser maior ou igual a 0")
  .nullable()
  .optional()
  .transform((v) => (v === undefined || v === null) ? null : v);

const TECHNICAL_ROLES: UserRole[] = [UserRole.DEV, UserRole.SUPORTE, UserRole.ARQUITETO];

export const createUserSchema = z
  .object({
    name: z.string().min(2, "Nome deve ter ao menos 2 caracteres").max(100),
    email: z.string().email("E-mail inválido"),
    password: z.string().min(8, "Senha temporária deve ter ao menos 8 caracteres"),
    role: z.nativeEnum(UserRole),
    workerProfile: workerProfileRule,
    monthlyBaseSalary: positiveFloatRule,
    monthlyCapValue:   positiveFloatRule,
    isActive: z.boolean().optional().default(true),
  })
  .refine(
    (data) => {
      if (TECHNICAL_ROLES.includes(data.role) && !data.workerProfile) return false;
      return true;
    },
    { message: "Perfil técnico é obrigatório para papéis técnicos (Dev, Suporte, Arquiteto)", path: ["workerProfile"] },
  );

export const updateUserSchema = z
  .object({
    name: z.string().min(2, "Nome deve ter ao menos 2 caracteres").max(100),
    role: z.nativeEnum(UserRole),
    workerProfile: workerProfileRule,
    monthlyBaseSalary: positiveFloatRule,
    monthlyCapValue:   positiveFloatRule,
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (TECHNICAL_ROLES.includes(data.role) && !data.workerProfile) return false;
      return true;
    },
    { message: "Perfil técnico é obrigatório para papéis técnicos (Dev, Suporte, Arquiteto)", path: ["workerProfile"] },
  );

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
