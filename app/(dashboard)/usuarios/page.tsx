import Link from "next/link";
import { requireRole } from "@/server/auth/helpers";
import { userService }      from "@/services/userService";
import { authConfigService } from "@/services/authConfigService";
import { UserTable }             from "@/components/usuarios/user-table";
import { AuthProviderToggle }    from "@/components/usuarios/auth-provider-toggle";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

export const metadata = { title: "Usuários — Gestor de Demandas" };

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const actor = await requireRole(["ADMIN"]);
  const { search } = await searchParams;

  const [users, authConfig] = await Promise.all([
    userService.listUsers({ search }),
    authConfigService.getConfig(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuários</h1>
          <p className="text-sm text-muted-foreground">{users.length} usuário(s) cadastrado(s)</p>
        </div>
        <Button asChild>
          <Link href="/usuarios/novo">
            <UserPlus className="mr-2 h-4 w-4" />
            Novo usuário
          </Link>
        </Button>
      </div>

      <AuthProviderToggle initialValue={authConfig.useEntraId} />

      <UserTable users={users} currentUserId={actor.id} defaultSearch={search ?? ""} />
    </div>
  );
}
