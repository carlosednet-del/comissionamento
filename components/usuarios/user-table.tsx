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
import { activateUserAction, deactivateUserAction, deleteUserAction, forcePasswordResetAction } from "@/server/actions/userActions";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MoreHorizontal, Pencil, UserCheck, UserX, Trash2,
  Search, ChevronsUpDown, ChevronUp, ChevronDown, KeyRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

  // Estado para os dialogs de ação
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [resetTarget,  setResetTarget]  = useState<{ id: string; name: string } | null>(null);

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

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    setLoadingId(id);
    startAction(async () => {
      await deleteUserAction(id);
      router.refresh();
      setLoadingId(null);
    });
  }

  function handleForceResetConfirm() {
    if (!resetTarget) return;
    const id = resetTarget.id;
    setResetTarget(null);
    setLoadingId(id);
    startAction(async () => {
      const result = await forcePasswordResetAction(id);
      if (result.success) {
        toast.success(result.message ?? "Reset de senha solicitado.");
      } else {
        toast.error(result.error ?? "Erro ao solicitar reset.");
      }
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
    <>
    {/* ── Dialog de confirmação de exclusão ──────────────────────── */}
    <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Excluir usuário permanentemente
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              <p>
                Você está prestes a excluir <strong className="text-foreground">{deleteTarget?.name}</strong> do sistema.
              </p>
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1 text-destructive">
                <p className="font-semibold">Esta ação é irreversível e irá remover:</p>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  <li>Todas as demandas criadas pelo usuário</li>
                  <li>Todas as evidências adicionadas pelo usuário</li>
                  <li>Todos os logs de auditoria do usuário</li>
                  <li>O acesso ao sistema (conta Supabase Auth)</li>
                  <li>Qualquer outro rastro no banco de dados</li>
                </ul>
              </div>
              <p className="text-muted-foreground">
                Demandas em andamento onde este usuário era responsável serão mantidas, mas ficarão sem responsável atribuído.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteConfirm}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Sim, excluir permanentemente
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* ── Dialog de confirmação de reset de senha ────────────────── */}
    <AlertDialog open={!!resetTarget} onOpenChange={(v) => { if (!v) setResetTarget(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
            <KeyRound className="h-5 w-5" />
            Forçar troca de senha
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm">
              <p>
                O usuário <strong className="text-foreground">{resetTarget?.name}</strong> será obrigado a
                cadastrar uma nova senha no próximo acesso.
              </p>
              <p className="text-muted-foreground">
                O acesso atual não é revogado imediatamente, mas qualquer nova navegação
                redirecionará para a tela de troca de senha.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleForceResetConfirm}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            <KeyRound className="mr-2 h-4 w-4" />
            Confirmar reset
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

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
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1">
                    <ActiveStatusBadge isActive={user.isActive} />
                    {user.forcePasswordChange && (
                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50 gap-1">
                        <KeyRound className="h-3 w-3" />
                        Senha temp.
                      </Badge>
                    )}
                  </div>
                </TableCell>
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
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-amber-600 focus:text-amber-600"
                        disabled={user.id === currentUserId}
                        onClick={() => setResetTarget({ id: user.id, name: user.name })}
                      >
                        <KeyRound className="mr-2 h-4 w-4" />
                        Forçar reset de senha
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive font-medium"
                        disabled={user.id === currentUserId}
                        onClick={() => setDeleteTarget({ id: user.id, name: user.name })}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir permanentemente
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
    </>
  );
}
