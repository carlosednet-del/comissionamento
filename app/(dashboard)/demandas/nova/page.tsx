import { redirect } from "next/navigation";
import { requireAuth, toPermissionUser } from "@/server/auth/helpers";
import { canCreateDemand } from "@/server/auth/permissions";
import { prisma } from "@/lib/prisma";
import { DemandForm } from "@/components/demandas/demand-form";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = { title: "Nova demanda — Gestor de Demandas" };

export default async function NovaDemandaPage() {
  const session = await requireAuth();
  const actor   = toPermissionUser(session);

  if (!canCreateDemand(actor)) {
    redirect("/demandas");
  }

  const assignees = await prisma.user.findMany({
    where:   { isActive: true, role: "DEV" },
    select:  { id: true, name: true, workerProfile: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/demandas">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Demandas
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-brand-text-dark">Nova demanda</h1>
        <p className="text-sm text-muted-foreground">
          Preencha as informações abaixo para registrar uma nova demanda técnica.
        </p>
      </div>

      <DemandForm mode="create" assignees={assignees} />
    </div>
  );
}
