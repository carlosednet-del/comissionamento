"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@prisma/client";
import { RoleBadge }          from "@/components/shared/role-badge";
import { WorkerProfileBadge } from "@/components/shared/worker-profile-badge";
import { ActiveStatusBadge }  from "@/components/shared/status-badge";
import { Button }  from "@/components/ui/button";
import { Input }   from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { activateUserAction, deactivateUserAction } from "@/server/actions/userActions";
import {
  MoreHorizontal, Pencil, UserCheck, UserX,
  Search, ChevronsUpDown, ChevronUp, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Tipos ─────────────────────────────────────────────────────────

type SortField = "name" | "email" | "role" | "workerProfile" | "isActive" | "createdAt";
type SortDir   = "asc" | "desc";

type Props = {
  users:         User[];
  currentUserId: string;
  defaultSearch?: string;
};

// ── Helper: ícone de ordenação ────────────────────────────────────

function SortIcon({ field, current, dir }: { field: SortField; current: SortField; dir: SortDir }) {
  if (field !== current) return <ChevronsUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/50" />;
  return dir === "asc"
    ? <ChevronUp   className="ml-1 h-3.5 w-3.5 text-brand-primary" />
    : <ChevronDown className="ml-1 h-3.5 w-3.5 text-brand-primary" />;
}

// ── Componente principal ──────────────────────────────────────────

export function UserTable({ users, currentUserId, defaultSearch = "" }: Props) {
  const router = useRouter();
  const [searchPending, startSearch] = useTransition();
  const [actionPending, startAction] = useTransition();
  const [loadingId, setLoadingId]    = useState<string | null>(null);

  // Busca (URL-based → servidor filtra → contagem correta no cabeçalho)
  const [localSearch, setLocalSearch] = useState(defaultSearch);

  function handleSearch(value: string) {
    setLocalSearch(value);
    startSearch(() => {
      const qs = value.trim() ? `?search=${encodeURIComponent(value.trim())}` : "";
      router.replace(`/usuarios${qs}`, { scroll: false });
    });
  }

  // Ordenação (client-side — instantânea, sem round-trip)
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir,   setSortDir]   = useState<SortDir>("asc");

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    return [...users].sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      switch (sortField) {
        case "name":          av = a.name.toLowerCase();           bv = b.name.toLowerCase();           break;
        case "email":         av = a.email.toLowerCase();          bv = b.email.toLowerCase();          break;
        case "role":          av = a.role;                         bv = b.role;                         break;
        case "workerProfile": av = a.workerProfile ?? "";          bv = b.workerProfile ?? "";          break;
        case "isActive":      av = a.isActive ? 1 : 0;            bv = b.isActive ? 1 : 0;             break;
        case "createdAt":     av = new Date(a.createdAt).getTime(); bv = new Date(b.createdAt).getTime(); break;
        default:              av = ""; bv = "";
      }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [users, sortField, sortDir]);

  // Ações
  function handleActivate(id: string) {
    setLoadingId(id);
    startAction(async () => {
      await activateUserAction(id);
      router.refresh();
      setLoadingId(null);
    });
  }

  function handleDeactivate(id: string) {
    setLoadingId(id);
    startAction(async () => {
      await deactivateUserAction(id);
      router.refresh();
      setLoadingId(null);
    });
  }

  // ── Cabeçalho de coluna clicável ────────────────────────────────
  function SortHead({ field, children, className }: {
    field: SortField; children: React.ReactNode; className?: string;
  }) {
    return (
      <TableHead
        className={cn("cursor-pointer select-none hover:text-foreground", className)}
        onClick={() => handleSort(field)}
      >
        <span className="inline-flex items-center gap-0">
          {children}
          <SortIcon field={field} current={sortField} dir={sortDir} />
        </span>
      </TableHead>
    );
  }

  return (
    <div className="space-y-3">
      {/* ── Barra de busca ───────────────────────────────────────── */}
      <div className="relative max-w-sm">
        <Search className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none",
          searchPending ? "text-brand-primary animate-pulse" : "text-muted-foreground",
        )} />
        <Input
          placeholder="Buscar por nome ou e-mail…"
          className="pl-9"
          value={localSearch}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {/* ── Tabela ───────────────────────────────────────────────── */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHead field="name">Nome</SortHead>
              <SortHead field="email">E-mail</SortHead>
              <SortHead field="role">Papel</SortHead>
              <SortHead field="workerProfile">Perfil técnico</SortHead>
              <SortHead field="isActive">Status</SortHead>
              <SortHead field="createdAt">Criado em</SortHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            )}
            {sorted.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>
                <TableCell><RoleBadge role={user.role} /></TableCell>
                <TableCell><WorkerProfileBadge profile={user.workerProfile} /></TableCell>
                <TableCell><ActiveStatusBadge isActive={user.isActive} /></TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={actionPending && loadingId === user.id}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Ações</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/usuarios/${user.id}`}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {user.isActive ? (
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          disabled={user.id === currentUserId}
                          onClick={() => handleDeactivate(user.id)}
                        >
                          <UserX className="mr-2 h-4 w-4" />
                          Desativar
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => handleActivate(user.id)}>
                          <UserCheck className="mr-2 h-4 w-4" />
                          Ativar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
