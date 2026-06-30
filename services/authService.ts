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

    const authPayload = {
      email:         params.email,
      password:      params.password,
      email_confirm: true,
      user_metadata: { role: params.role, isActive: params.isActive, forcePasswordChange: true },
    };

    const { data, error } = await admin.auth.admin.createUser(authPayload);

    // E-mail já cadastrado no Auth mas sem registro no banco (usuário excluído
    // permanentemente enquanto a remoção do Auth falhou silenciosamente).
    // Localiza o usuário órfão pelo e-mail, remove e recria.
    if (error) {
      const isEmailTaken =
        error.message.includes("already been registered") ||
        error.message.includes("already registered")      ||
        error.message.includes("already exists");

      if (isEmailTaken) {
        // Lista usuários (até 1 000 — suficiente para a maioria dos ambientes)
        const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000, page: 1 });
        const orphan = list?.users?.find((u) => u.email === params.email);

        if (orphan) {
          await admin.auth.admin.deleteUser(orphan.id);

          // Tenta criar novamente após limpar o órfão
          const { data: retry, error: retryErr } = await admin.auth.admin.createUser(authPayload);
          if (retryErr) throw new AuthError(`Erro ao criar usuário no Auth: ${retryErr.message}`);
          return retry.user;
        }
      }

      throw new AuthError(`Erro ao criar usuário no Auth: ${error.message}`);
    }

    return data.user;
  },

  /** Atualiza metadata do usuário no Supabase Auth (merges com metadata existente). */
  async updateAuthUserMetadata(
    authUserId: string,
    metadata: { role?: UserRole; isActive?: boolean; forcePasswordChange?: boolean },
  ) {
    const admin = createAdminClient();

    const { error } = await admin.auth.admin.updateUserById(authUserId, {
      user_metadata: metadata,
    });

    if (error) throw new AuthError(`Erro ao atualizar metadata no Auth: ${error.message}`);
  },

  /** Atualiza a senha do usuário autenticado via sessão atual (não requer admin). */
  async updateCurrentUserPassword(newPassword: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      data: { forcePasswordChange: false },
    });
    if (error) throw new AuthError(`Erro ao atualizar senha: ${error.message}`);
  },

  /** Remove usuário do Supabase Auth */
  async deleteAuthUser(authUserId: string) {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(authUserId);
    if (error) throw new AuthError(`Erro ao remover usuário no Auth: ${error.message}`);
  },
};
