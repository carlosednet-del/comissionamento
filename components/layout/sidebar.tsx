"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { logoutAction } from "@/server/actions/authActions";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  LogOut,
  ChevronRight,
  Layers,
} from "lucide-react";
import type { UserRole } from "@prisma/client";

type SidebarUser = {
  name: string;
  email: string;
  role: UserRole;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: UserRole[];
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard",  icon: LayoutDashboard, roles: ["ADMIN", "GESTOR", "FINANCEIRO"] },
  { href: "/demandas",  label: "Demandas",   icon: ClipboardList },
  { href: "/usuarios",  label: "Usuários",   icon: Users, roles: ["ADMIN"] },
];

export function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(user.role),
  );

  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <aside className="flex w-60 shrink-0 flex-col bg-gradient-to-b from-brand-text-dark to-brand-text-body">
      {/* ── Logo ─────────────────────────────────────────────────── */}
      <div className="flex h-14 items-center gap-2.5 px-4 border-b border-white/10">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-primary/80 shadow-inner shadow-white/10">
          <Layers className="h-4 w-4 text-white" />
        </div>
        <span className="font-semibold text-sm text-white tracking-wide">
          Gestor de Demandas
        </span>
      </div>

      {/* ── Navegação ───────────────────────────────────────────── */}
      <nav className="flex-1 space-y-0.5 p-3">
        {visibleItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-white/20 text-white shadow-sm"
                  : "text-white/65 hover:bg-white/10 hover:text-white",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
              {isActive && <ChevronRight className="ml-auto h-3 w-3 opacity-70" />}
            </Link>
          );
        })}
      </nav>

      {/* ── Divisor ─────────────────────────────────────────────── */}
      <div className="mx-3 h-px bg-white/10" />

      {/* ── Usuário + logout ────────────────────────────────────── */}
      <div className="p-3 space-y-1">
        <Link
          href="/perfil"
          className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/10 transition-colors"
        >
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="text-xs bg-brand-primary/70 text-white font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <p className="text-xs text-white/50 truncate">{user.email}</p>
          </div>
        </Link>

        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-red-500/20 hover:text-red-300 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
