import { requireAuth } from "@/server/auth/helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleBadge } from "@/components/shared/role-badge";
import { WorkerProfileBadge } from "@/components/shared/worker-profile-badge";
import { ActiveStatusBadge } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const metadata = { title: "Meu Perfil — Gestor de Demandas" };

export default async function PerfilPage() {
  const user = await requireAuth();

  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((n: string) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Meu perfil</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-xl">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{user.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Papel</p>
              <RoleBadge role={user.role} />
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Perfil técnico</p>
              <WorkerProfileBadge profile={user.workerProfile as Parameters<typeof WorkerProfileBadge>[0]["profile"]} />
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Status</p>
              <ActiveStatusBadge isActive={user.isActive} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
