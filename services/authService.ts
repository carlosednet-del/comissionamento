import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loginSchema, type LoginInput } from "@/validations/auth";
import type { UserRole } from "@prisma/client";

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export const authService = {
  async login(input: LoginInput) {
    const { email, password } = loginSchema.parse(input);
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        throw new AuthError("E-mail ou senha incorretos");
      }
      throw new AuthError(error.message);
    }

    return data;
  },

  async logout() {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw new AuthError(error.message);
  },

  async getSession() {
    const supabase = await createClient();
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  /** Cria usuário no Supabase Auth via service role (server-side only) */
  async createAuthUser(params: {
    email: string;
    password: string;
    role: UserRole;
    isActive: boolean;
  }) {
    const admin = createAdminClient();

    const { data, error } = await admin.auth.admin.createUser({
      email: params.email,
      password: params.password,
      email_confirm: true,
      user_metadata: {
        role: params.role,
        isActive: params.isActive,
      },
    });

    if (error) throw new AuthError(`Erro ao criar usuário no Auth: ${error.message}`);
    return data.user;
  },

  /** Atualiza metadata do usuário no Supabase Auth (mantém role e isActive em sincronia) */
  async updateAuthUserMetadata(authUserId: string, metadata: { role?: UserRole; isActive?: boolean }) {
    const admin = createAdminClient();

    const { error } = await admin.auth.admin.updateUserById(authUserId, {
      user_metadata: metadata,
    });

    if (error) throw new AuthError(`Erro ao atualizar metadata no Auth: ${error.message}`);
  },

  /** Remove usuário do Supabase Auth */
  async deleteAuthUser(authUserId: string) {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(authUserId);
    if (error) throw new AuthError(`Erro ao remover usuário no Auth: ${error.message}`);
  },
};
