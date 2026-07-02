import { notFound } from "next/navigation";
import { requireAuth, toPermissionUser } from "@/server/auth/helpers";
import { demandService } from "@/services/demandService";
import { demandRepository } from "@/repositories/demandRepository";
import { DemandDetail } from "@/components/demandas/demand-detail";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AuditLog } from "@prisma/client";

export const metadata = { title: "Detalhe da demanda — Gestor de Demandas" };

type AuditLogWithUser = AuditLog & {
  user: { id: string; name: string };
};

export default async function DemandaDetailPage({
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

  const auditLogs = await demandService.getAuditLogs(id);
  const nextDemand = await demandRepository.findNextInStatus(id, demand.status, demand.createdAt);

  return (
    <div className="space-y-6">
      {/* Breadcrumb + atalho próxima demanda */}
      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/demandas">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Demandas
          </Link>
        </Button>

        {nextDemand && (
          <Link
            href={`/demandas/${nextDemand.id}`}
            className="group flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground hover:border-brand-primary/40 hover:bg-brand-bg-light/40 hover:text-foreground transition-colors max-w-xs"
          >
            <span className="flex flex-col min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70 leading-none mb-0.5">
                Próxima ({demand.status.replace(/_/g, " ").toLowerCase()})
              </span>
              <span className="truncate font-medium text-xs leading-snug">
                {nextDemand.title}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-brand-primary transition-colors" />
          </Link>
        )}
      </div>

      <DemandDetail
        demand={demand}
        actor={actor}
        auditLogs={auditLogs as AuditLogWithUser[]}
      />
    </div>
  );
}
