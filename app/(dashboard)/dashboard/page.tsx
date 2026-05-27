import { requireAuth } from "@/server/auth/helpers";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ClipboardList, CheckCircle, Clock } from "lucide-react";

export const metadata = { title: "Dashboard — Gestor de Demandas" };

export default async function DashboardPage() {
  const user = await requireAuth();

  const [totalUsers, totalDemands, homologadas, emDesenvolvimento] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.demand.count(),
    prisma.demand.count({ where: { status: "HOMOLOGADA_PRODUCAO" } }),
    prisma.demand.count({ where: { status: "EM_DESENVOLVIMENTO" } }),
  ]);

  const stats = [
    { label: "Usuários ativos", value: totalUsers, icon: Users, color: "text-blue-600" },
    { label: "Total de demandas", value: totalDemands, icon: ClipboardList, color: "text-violet-600" },
    { label: "Em desenvolvimento", value: emDesenvolvimento, icon: Clock, color: "text-amber-600" },
    { label: "Homologadas em produção", value: homologadas, icon: CheckCircle, color: "text-green-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Bem-vindo, {user.name}.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
