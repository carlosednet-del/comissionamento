import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code    = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/dashboard";
  // Aceita somente URLs relativas internas para prevenir open redirect
  const next    = /^\/[^/]/.test(rawNext) ? rawNext : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const user = data.user;
      const isOAuth = user.app_metadata?.provider !== "email";

      if (isOAuth) {
        const hasRole = !!user.user_metadata?.role;

        if (!hasRole) {
          // Primeiro login OAuth: sincroniza metadata a partir do registro no DB
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email! },
            select: { id: true, role: true, isActive: true, authUserId: true },
          });

          if (!dbUser) {
            // Usuário não pré-cadastrado no sistema
            return NextResponse.redirect(`${origin}/sem-perfil`);
          }

          const admin = createAdminClient();
          await admin.auth.admin.updateUserById(user.id, {
            user_metadata: {
              role:                dbUser.role,
              isActive:            dbUser.isActive,
              forcePasswordChange: false,
            },
          });

          // Vincula o authUserId do Supabase ao registro do DB se ainda não tiver
          if (!dbUser.authUserId) {
            await prisma.user.update({
              where: { id: dbUser.id },
              data:  { authUserId: user.id },
            });
          }
        } else if (user.user_metadata?.forcePasswordChange === true) {
          // Usuário pré-cadastrado com troca obrigatória pendente:
          // autenticação via Microsoft dispensa a troca de senha
          const admin = createAdminClient();
          await admin.auth.admin.updateUserById(user.id, {
            user_metadata: { forcePasswordChange: false },
          });
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-callback`);
}
