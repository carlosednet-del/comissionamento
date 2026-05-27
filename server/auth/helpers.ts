import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import type { UserForPermission } from "@/server/auth/permissions";

export type SessionUser = {
  id: string;
  authUserId: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  workerProfile: string | null;
};

/**
 * Retorna o usuário autenticado atual (sessão Supabase + registro DB).
 * Retorna null se não houver sessão ou usuário não existir no DB.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const dbUser = await prisma.user.findUnique({
    where: { authUserId: user.id },
    select: {
      id: true,
      authUserId: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      workerProfile: true,
    },
  });

  if (!dbUser || !dbUser.authUserId) return null;

  return dbUser as SessionUser;
}

/**
 * Exige autenticação. Redireciona para /login se não autenticado.
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.isActive) redirect("/acesso-bloqueado");
  return user;
}

/**
 * Exige autenticação E um dos papéis informados.
 * Redireciona para /dashboard com erro se não tiver permissão.
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
