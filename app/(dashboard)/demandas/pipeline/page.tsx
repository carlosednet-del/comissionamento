import { requireAuth, toPermissionUser } from "@/server/auth/helpers";
import { redirect }                      from "next/navigation";
import { prisma }                        from "@/lib/prisma";
import { DemandPipelineChart }           from "@/components/demandas/pipeline/demand-pipeline-chart";
import type { PipelineDemand }           from "@/components/demandas/pipeline/demand-pipeline-chart";

export const metadata = { title: "Pipeline Pedras — Gestor de Demandas" };

export default async function PipelinePage() {
  const session = await requireAuth();
  const actor   = toPermissionUser(session);

  if (actor.role !== "ADMIN" && actor.role !== "GESTOR") redirect("/dashboard");

  const rows = await prisma.demand.findMany({
    where: { isPedra: true },
    select: {
      id:                  true,
      title:               true,
      status:              true,
      priority:            true,
      requesterArea:       true,
      estimatedHours:      true,
      plannedStartDate:    true,
      plannedDeliveryDate: true,
      actualStartDate:     true,
      actualDeliveryDate:  true,
      assignee: { select: { id: true, name: true } },
    },
    orderBy: [{ plannedDeliveryDate: { sort: "asc", nulls: "last" } }],
  });

  // Serialize dates to ISO strings for the client component
  const demands: PipelineDemand[] = rows.map(r => ({
    ...r,
    plannedStartDate:    r.plannedStartDate?.toISOString()    ?? null,
    plannedDeliveryDate: r.plannedDeliveryDate?.toISOString() ?? null,
    actualStartDate:     r.actualStartDate?.toISOString()     ?? null,
    actualDeliveryDate:  r.actualDeliveryDate?.toISOString()  ?? null,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-brand-text-dark">Pipeline 🪨 Pedras</h1>
        <p className="text-sm text-muted-foreground">
          Cronograma das demandas marcadas como Pedra — {demands.length} demanda{demands.length !== 1 ? "s" : ""}.
        </p>
      </div>
      <DemandPipelineChart demands={demands} />
    </div>
  );
}
