import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { UserRole } from "@prisma/client";

const { auth } = NextAuth(authConfig);

const PUBLIC_ROUTES  = ["/login", "/acesso-bloqueado", "/sem-perfil", "/api/auth"];
const ADMIN_ROUTES   = ["/usuarios", "/configuracoes", "/parametros"];
const DASHBOARD_ROLES: UserRole[] = ["ADMIN", "DIRETOR", "GESTOR", "FINANCEIRO", "DEV"];
const STATEMENT_ROLES: UserRole[] = ["DEV", "ADMIN", "DIRETOR"];
const DAP_ROLES: UserRole[]       = ["DAP", "ADMIN", "DIRETOR", "FINANCEIRO"];
const EXEC_BLOCKED: UserRole[]    = ["DEV", "SOLICITANTE", "APROVADOR", "SUPORTE", "ARQUITETO"];

function homeFor(role: UserRole | undefined): string {
  if (!role) return "/demandas";
  return DASHBOARD_ROLES.includes(role) ? "/dashboard" : "/demandas";
}

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some((r) => pathname.startsWith(r));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default auth((req: any) => {
  const { pathname } = req.nextUrl as NextRequest["nextUrl"];
  const user = req.auth?.user as { role: UserRole; isActive: boolean; forcePasswordChange: boolean } | undefined;

  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.includes(".")) {
    return NextResponse.next();
  }

  if (!user && !isPublicRoute(pathname)) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === "/login") {
    if (user.forcePasswordChange) {
      const url = req.nextUrl.clone();
      url.pathname = "/change-password";
      return NextResponse.redirect(url);
    }
    const url = req.nextUrl.clone();
    url.pathname = homeFor(user.role);
    return NextResponse.redirect(url);
  }

  if (user) {
    if (!user.isActive && !isPublicRoute(pathname)) {
      const url = req.nextUrl.clone();
      url.pathname = "/acesso-bloqueado";
      return NextResponse.redirect(url);
    }

    if (user.forcePasswordChange && !pathname.startsWith("/change-password")) {
      const url = req.nextUrl.clone();
      url.pathname = "/change-password";
      return NextResponse.redirect(url);
    }
    if (!user.forcePasswordChange && pathname.startsWith("/change-password")) {
      const url = req.nextUrl.clone();
      url.pathname = homeFor(user.role);
      return NextResponse.redirect(url);
    }

    const role = user.role;

    if (ADMIN_ROUTES.some((r) => pathname.startsWith(r))) {
      if (role !== "ADMIN" && role !== "DIRETOR") {
        const url = req.nextUrl.clone();
        url.pathname = homeFor(role);
        url.searchParams.set("error", "sem-permissao");
        return NextResponse.redirect(url);
      }
    }

    if (pathname.startsWith("/dashboard") && !DASHBOARD_ROLES.includes(role)) {
      const url = req.nextUrl.clone();
      url.pathname = "/demandas";
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/meu-extrato") && !STATEMENT_ROLES.includes(role)) {
      const url = req.nextUrl.clone();
      url.pathname = homeFor(role);
      url.searchParams.set("error", "sem-permissao");
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/fechamento-dap") && !DAP_ROLES.includes(role)) {
      const url = req.nextUrl.clone();
      url.pathname = homeFor(role);
      url.searchParams.set("error", "sem-permissao");
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/dashboard-executivo") && EXEC_BLOCKED.includes(role)) {
      const url = req.nextUrl.clone();
      url.pathname = homeFor(role);
      url.searchParams.set("error", "sem-permissao");
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
