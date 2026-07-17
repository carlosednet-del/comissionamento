import { signOut } from "@/auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Rota de logout forçado para usuários com Entra ID ativo que ainda têm
 * uma sessão de credenciais (e-mail/senha) válida no cookie JWT.
 * Chamada automaticamente por getCurrentUser() ao detectar conflito.
 */
export async function GET(request: NextRequest) {
  await signOut({ redirect: false });
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("reason", "entra-id");
  return NextResponse.redirect(loginUrl);
}
