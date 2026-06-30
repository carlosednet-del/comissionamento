import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter ao menos 6 caracteres"),
});

export type LoginInput = z.infer<typeof loginSchema>;

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const changePasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "A senha deve ter no mínimo 8 caracteres.")
      .regex(
        STRONG_PASSWORD_REGEX,
        "A senha deve conter letra maiúscula, minúscula, número e caractere especial.",
      ),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "As senhas não conferem.",
    path: ["confirmPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
