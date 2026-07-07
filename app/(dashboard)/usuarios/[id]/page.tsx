import { notFound } from "next/navigation";
import { requireRole } from "@/server/auth/helpers";
import { userService } from "@/services/userService";
import { UserForm } from "@/components/usuarios/user-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleBadge } from "@/components/shared/role-badge";
import { ActiveStatusBadge } from "@/components/shared/status-badge";

export const metadata = { title: "Editar Usuário — Gestor de Demandas" };

export default async function EditarUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["ADMIN"]);
  const { id } = await params;

  let user;
  try {
    user = await userService.getById(id);
  } catch {
    notFound();
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Editar usuário</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <RoleBadge role={user.role} />
          <ActiveStatusBadge isActive={user.isActive} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do usuário</CardTitle>
        </CardHeader>
        <CardContent>
          <UserForm
            mode="edit"
            userId={user.id}
            defaultValues={{
              name:              user.name,
              role:              user.role,
              workerProfile:     user.workerProfile,
              monthlyBaseSalary: user.monthlyBaseSalary,
              monthlyCapValue:   user.monthlyCapValue,
              isActive:          user.isActive,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
