import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export const authService = {
  /** Cria o hash bcrypt da senha — usado ao criar ou redefinir usuários. */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  },

  /** Atualiza a senha do usuário armazenando o hash bcrypt no banco. */
  async updateCurrentUserPassword(userId: string, newPassword: string): Promise<void> {
    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data:  { passwordHash: hash, forcePasswordChange: false },
    });
  },

  /**
   * @deprecated Mantido para não quebrar chamadas existentes.
   * Com NextAuth, o metadata do Supabase não é mais usado.
   */
  async updateAuthUserMetadata(
    _authUserId: string,
    _metadata: { role?: UserRole; isActive?: boolean; forcePasswordChange?: boolean },
  ): Promise<void> {
    // no-op: NextAuth lê dados direto do Prisma
  },

  /** @deprecated Não necessário com NextAuth — mantido para compatibilidade. */
  async deleteAuthUser(_authUserId: string): Promise<void> {
    // no-op: sem Supabase Auth
  },
};
