import { notFound, redirect } from "next/navigation";
import { requireAuth, toPermissionUser } from "@/server/auth/helpers";
import { demandService } from "@/services/demandService";
import { canEditDemand } from "@/server/auth/permissions";
import { prisma } from "@/lib/prisma";
import { DemandForm } from "@/components/demandas/demand-form";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = { title: "Editar demanda — Gestor de Demandas" };

export default async function EditarDemandaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id }  = await params;
  const session = await requireAuth();
  const actor   = toPermissionUser(session);

  let demand;
  try {
    demand = await demandService.getById(id, actor);
  } catch {
    notFound();
  }

  if (!demand) notFound();

  const demandPerm = {
    id:         demand.id,
    creatorId:  demand.creatorId,
    assigneeId: demand.assigneeId,
    status:     demand.status,
  };

  if (!canEditDemand(actor, demandPerm)) {
    redirect(`/demandas/${id}`);
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
          <Link href={`/demandas/${id}`}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Voltar para a demanda
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-brand-text-dark">Editar demanda</h1>
        <p className="text-sm text-muted-foreground line-clamp-1">{demand.title}</p>
      </div>

      <DemandForm mode="edit" demand={demand} assignees={assignees} />
    </div>
  );
}
