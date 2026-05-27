import { requireRole } from "@/server/auth/helpers";
import { UserForm } from "@/components/usuarios/user-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Novo Usuário — Gestor de Demandas" };

export default async function NovoUsuarioPage() {
  await requireRole(["ADMIN"]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Novo usuário</h1>
        <p className="text-sm text-muted-foreground">
          Crie um novo usuário. Uma senha temporária será configurada.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do usuário</CardTitle>
          <CardDescription>
            O usuário receberá acesso ao sistema com a senha informada e deverá alterá-la no primeiro
            login.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
