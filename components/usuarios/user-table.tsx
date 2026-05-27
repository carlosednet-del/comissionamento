"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@prisma/client";
import { RoleBadge } from "@/components/shared/role-badge";
import { WorkerProfileBadge } from "@/components/shared/worker-profile-badge";
import { ActiveStatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { activateUserAction, deactivateUserAction } from "@/server/actions/userActions";
import { MoreHorizontal, Pencil, UserCheck, UserX } from "lucide-react";

type Props = {
  users: User[];
  currentUserId: string;
};

export function UserTable({ users, currentUserId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  function handleActivate(id: string) {
    setLoadingId(id);
    startTransition(async () => {
      await activateUserAction(id);
      router.refresh();
      setLoadingId(null);
    });
  }

  function handleDeactivate(id: string) {
    setLoadingId(id);
    startTransition(async () => {
      await deactivateUserAction(id);
      router.refresh();
      setLoadingId(null);
    });
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Papel</TableHead>
            <TableHead>Perfil técnico</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Criado em</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                Nenhum usuário encontrado.
              </TableCell>
            </TableRow>
          )}
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>
              <TableCell>
                <RoleBadge role={user.role} />
              </TableCell>
              <TableCell>
                <WorkerProfileBadge profile={user.workerProfile} />
              </TableCell>
              <TableCell>
                <ActiveStatusBadge isActive={user.isActive} />
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
                      disabled={pending && loadingId === user.id}
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
  );
}
