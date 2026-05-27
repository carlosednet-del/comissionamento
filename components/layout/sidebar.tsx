"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { logoutAction } from "@/server/actions/authActions";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  LogOut,
  ChevronRight,
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
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "GESTOR", "FINANCEIRO"] },
  { href: "/demandas", label: "Demandas", icon: ClipboardList },
  { href: "/usuarios", label: "Usuários", icon: Users, roles: ["ADMIN"] },
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
    <aside className="flex w-60 flex-col border-r bg-card">
      <div className="flex h-14 items-center px-4 border-b">
        <span className="font-semibold text-sm">Gestor de Demandas</span>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {visibleItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
              {isActive && <ChevronRight className="ml-auto h-3 w-3" />}
            </Link>
          );
        })}
      </nav>

      <Separator />

      <div className="p-3">
        <div className="flex items-center gap-3 rounded-md px-3 py-2 mb-1">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>

        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
