import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireAuth, toPermissionUser } from "@/server/auth/helpers";
import { demandService } from "@/services/demandService";
import { canEditDemand, DEMAND_EDITABLE_STATUSES } from "@/server/auth/permissions";
import { prisma } from "@/lib/prisma";
import { DemandForm } from "@/components/demandas/demand-form";
import { StatusBadge } from "@/components/demandas/status-badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ChevronLeft, AlertTriangle, ArrowLeft } from "lucide-react";

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

  // Status não permite edição livre → tela amigável de bloqueio
  const statusIsEditable = (DEMAND_EDITABLE_STATUSES as readonly string[]).includes(demand.status);
  if (!statusIsEditable) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href={`/demandas/${id}`}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Voltar para a demanda
            </Link>
          </Button>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <StatusBadge status={demand.status} />
          </div>
          <h1 className="text-2xl font-bold text-brand-text-dark">Editar demanda</h1>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{demand.title}</p>
        </div>

        <Alert variant="destructive" className="border-amber-300 bg-amber-50 text-amber-900 [&>svg]:text-amber-600">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-amber-800 font-semibold">
            Edição não permitida neste estágio
          </AlertTitle>
          <AlertDescription className="text-amber-700 mt-1">
            Esta demanda já entrou no fluxo de análise e não pode mais ser editada livremente.
            Utilize as ações disponíveis na tela de detalhes para avançar o fluxo de trabalho.
          </AlertDescription>
        </Alert>

        <Button asChild variant="outline">
          <Link href={`/demandas/${id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para o detalhe
          </Link>
        </Button>
      </div>
    );
  }

  // Usuário não tem permissão de edição → redirecionar
  if (!canEditDemand(actor, demandPerm)) {
    redirect(`/demandas/${id}`);
  }

  const assignees = await prisma.user.findMany({
    where:   { isActive: true, role: { in: ["DEV", "GESTOR", "ARQUITETO", "SUPORTE"] } },
    select:  { id: true, name: true, workerProfile: true, role: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href={`/demandas/${id}`}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Voltar para a demanda
          </Link>
        </Button>
      </div>

      {/* Cabeçalho */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <StatusBadge status={demand.status} />
        </div>
        <h1 className="text-2xl font-bold text-brand-text-dark">Editar demanda</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Atualize as informações antes da etapa de análise.
        </p>
        <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5 font-medium">
          {demand.title}
        </p>
      </div>

      <DemandForm mode="edit" demand={demand} assignees={assignees} actorRole={actor.role} />
    </div>
  );
}
