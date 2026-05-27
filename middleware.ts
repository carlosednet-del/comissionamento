import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { UserRole } from "@prisma/client";

const PUBLIC_ROUTES = ["/login", "/acesso-bloqueado", "/api/auth/callback"];
const ADMIN_ROUTES = ["/usuarios", "/parametros"];

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
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
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

  // Usuário autenticado tentando acessar /login → dashboard
  if (user && pathname === "/login") {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    return NextResponse.redirect(dashboardUrl);
  }

  // Checar se usuário está inativo via metadata (sem DB query)
  if (user) {
    const isActive = user.user_metadata?.isActive !== false;
    if (!isActive && !isPublicRoute(pathname)) {
      const blockedUrl = request.nextUrl.clone();
      blockedUrl.pathname = "/acesso-bloqueado";
      return NextResponse.redirect(blockedUrl);
    }

    // Verificar permissão ADMIN para rotas administrativas
    if (isAdminRoute(pathname)) {
      const role = user.user_metadata?.role as UserRole | undefined;
      if (role !== "ADMIN") {
        const dashboardUrl = request.nextUrl.clone();
        dashboardUrl.pathname = "/dashboard";
        dashboardUrl.searchParams.set("error", "sem-permissao");
        return NextResponse.redirect(dashboardUrl);
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
