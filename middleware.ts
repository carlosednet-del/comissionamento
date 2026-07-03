import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { UserRole } from "@prisma/client";

const PUBLIC_ROUTES       = ["/login", "/acesso-bloqueado", "/sem-perfil", "/api/auth/callback"];
const ADMIN_ROUTES        = ["/usuarios", "/configuracoes", "/parametros"];
const STATEMENT_ROLES: UserRole[] = ["DEV", "ADMIN", "DIRETOR"];
const DAP_ROLES: UserRole[]       = ["DAP", "ADMIN", "DIRETOR", "FINANCEIRO"];

/** Papéis que têm acesso ao dashboard financeiro */
const DASHBOARD_ROLES: UserRole[] = ["ADMIN", "DIRETOR", "GESTOR", "FINANCEIRO", "DEV"];

/** Retorna a página inicial correta conforme o papel */
function homeFor(role: UserRole | undefined): string {
  if (!role) return "/demandas";
  return DASHBOARD_ROLES.includes(role) ? "/dashboard" : "/demandas";
}

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some((r) => pathname.startsWith(r));
}

function isAdminRoute(pathname: string) {
  return ADMIN_ROUTES.some((r) => pathname.startsWith(r));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Arquivos estáticos e rotas de API internas não precisam de proteção
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            supabaseResponse.cookies.set(name, value, options as any),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Usuário não autenticado tentando acessar rota privada
  if (!user && !isPublicRoute(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Usuário autenticado tentando acessar /login
  if (user && pathname === "/login") {
    // Troca de senha obrigatória → /change-password antes do dashboard
    if (user.user_metadata?.forcePasswordChange === true) {
      const cpUrl = request.nextUrl.clone();
      cpUrl.pathname = "/change-password";
      return NextResponse.redirect(cpUrl);
    }
    const role = user.user_metadata?.role as UserRole | undefined;
    const home = homeFor(role);
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = home;
    return NextResponse.redirect(homeUrl);
  }

  // Checar se usuário está inativo via metadata (sem DB query)
  if (user) {
    const isActive = user.user_metadata?.isActive !== false;
    if (!isActive && !isPublicRoute(pathname)) {
      const blockedUrl = request.nextUrl.clone();
      blockedUrl.pathname = "/acesso-bloqueado";
      return NextResponse.redirect(blockedUrl);
    }

    // Troca obrigatória de senha
    const forcePasswordChange = user.user_metadata?.forcePasswordChange === true;
    if (forcePasswordChange && !pathname.startsWith("/change-password")) {
      const cpUrl = request.nextUrl.clone();
      cpUrl.pathname = "/change-password";
      return NextResponse.redirect(cpUrl);
    }
    // Senha já atualizada tentando acessar /change-password → home
    if (!forcePasswordChange && pathname.startsWith("/change-password")) {
      const role = user.user_metadata?.role as UserRole | undefined;
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = homeFor(role);
      return NextResponse.redirect(homeUrl);
    }

    const role = user.user_metadata?.role as UserRole | undefined;

    // Verificar permissão ADMIN/DIRETOR para rotas administrativas
    if (isAdminRoute(pathname)) {
      if (role !== "ADMIN" && role !== "DIRETOR") {
        const dest = request.nextUrl.clone();
        dest.pathname = homeFor(role);
        dest.searchParams.set("error", "sem-permissao");
        return NextResponse.redirect(dest);
      }
    }

    // Bloquear /dashboard para papéis sem acesso (ex.: SOLICITANTE, APROVADOR)
    if (pathname.startsWith("/dashboard") && !DASHBOARD_ROLES.includes(role as UserRole)) {
      const dest = request.nextUrl.clone();
      dest.pathname = "/demandas";
      return NextResponse.redirect(dest);
    }

    // Bloquear /meu-extrato para papéis sem acesso
    if (pathname.startsWith("/meu-extrato") && !STATEMENT_ROLES.includes(role as UserRole)) {
      const dest = request.nextUrl.clone();
      dest.pathname = homeFor(role);
      dest.searchParams.set("error", "sem-permissao");
      return NextResponse.redirect(dest);
    }

    // Bloquear /fechamento-dap para papéis sem acesso
    if (pathname.startsWith("/fechamento-dap") && !DAP_ROLES.includes(role as UserRole)) {
      const dest = request.nextUrl.clone();
      dest.pathname = homeFor(role);
      dest.searchParams.set("error", "sem-permissao");
      return NextResponse.redirect(dest);
    }

    // Bloquear /dashboard-executivo para DEV, SOLICITANTE, APROVADOR
    const EXEC_BLOCKED: UserRole[] = ["DEV", "SOLICITANTE", "APROVADOR", "SUPORTE", "ARQUITETO"];
    if (pathname.startsWith("/dashboard-executivo") && EXEC_BLOCKED.includes(role as UserRole)) {
      const dest = request.nextUrl.clone();
      dest.pathname = homeFor(role);
      dest.searchParams.set("error", "sem-permissao");
      return NextResponse.redirect(dest);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
