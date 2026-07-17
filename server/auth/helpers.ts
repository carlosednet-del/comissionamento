import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { UserRole, WorkerProfile } from "@prisma/client";
import type { UserForPermission } from "@/server/auth/permissions";

export type SessionUser = {
  id:                  string;
  authUserId:          string | null;
  name:                string;
  email:               string;
  role:                UserRole;
  isActive:            boolean;
  workerProfile:       WorkerProfile | null;
  forcePasswordChange: boolean;
  authProvider:        string;
};

/**
 * Retorna o usuário autenticado atual lido do banco.
 * Usa o ID da sessão NextAuth para buscar dados frescos no Prisma.
 * Retorna null se não houver sessão ou usuário não existir no DB.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const authProvider: string = (session.user as any).authProvider ?? "credentials";

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id:                  true,
      authUserId:          true,
      name:                true,
      email:               true,
      role:                true,
      isActive:            true,
      workerProfile:       true,
      forcePasswordChange: true,
      useEntraId:          true,
    },
  });

  if (!dbUser) return null;

  // Sessão via credenciais, mas o usuário agora exige Entra ID → força logout imediato
  if (dbUser.useEntraId && authProvider === "credentials") {
    redirect("/api/signout-entra");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { useEntraId: _entraId, ...rest } = dbUser;
  return { ...rest, authProvider } as SessionUser;
}

/**
 * Exige autenticação. Redireciona para /login se não autenticado.
 * Redireciona para /sem-perfil se há sessão mas sem registro no DB.
 */
export async function requireAuth(): Promise<SessionUser> {
  const session = await auth();

  if (!session?.user?.id) redirect("/login");

  const user = await getCurrentUser();
  if (!user) redirect("/sem-perfil");
  if (!user.isActive) redirect("/acesso-bloqueado");

  return user;
}

/**
 * Exige autenticação E um dos papéis informados.
 */
export async function requireRole(roles: UserRole[]): Promise<SessionUser> {
  const user = await requireAuth();
  if (!roles.includes(user.role)) {
    redirect("/dashboard?error=sem-permissao");
  }
  return user;
}

/**
 * Converte SessionUser para o tipo enxuto usado nas funções de permissão.
 */
export function toPermissionUser(user: SessionUser): UserForPermission {
  return { id: user.id, role: user.role, isActive: user.isActive };
}
