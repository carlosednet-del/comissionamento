import Link from "next/link";
import { requireAuth, toPermissionUser } from "@/server/auth/helpers";
import { canCreateDemand } from "@/server/auth/permissions";
import { demandService } from "@/services/demandService";
import { DemandStats } from "@/components/demandas/demand-stats";
import { DemandFilters } from "@/components/demandas/demand-filters";
import { DemandTable } from "@/components/demandas/demand-table";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid } from "lucide-react";
import type { DemandStatus, DemandPriority, DemandType } from "@prisma/client";

export const metadata = { title: "Demandas — Gestor de Demandas" };

type SearchParams = {
  search?:     string;
  status?:     string;
  priority?:   string;
  demandType?: string;
  page?:       string;
};

export default async function DemandasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireAuth();
  const actor   = toPermissionUser(session);
  const sp      = await searchParams;

  const page     = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const filters  = {
    search:     sp.search    || undefined,
    status:     (sp.status    as DemandStatus)    || undefined,
    priority:   (sp.priority  as DemandPriority)  || undefined,
    demandType: (sp.demandType as DemandType)      || undefined,
    page,
    pageSize: 20,
  };

  const [result, stats] = await Promise.all([
    demandService.listDemands(filters),
    demandService.getStats(),
  ]);

  const userCanCreate = canCreateDemand(actor);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-text-dark">Demandas</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie e acompanhe o fluxo de demandas técnicas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/demandas/kanban">
              <LayoutGrid className="mr-2 h-4 w-4" />
              Kanban
            </Link>
          </Button>
          {userCanCreate && (
            <Button asChild>
              <Link href="/demandas/nova">
                <Plus className="mr-2 h-4 w-4" />
                Nova demanda
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <DemandStats stats={stats} />

      {/* Filtros */}
      <DemandFilters />

      {/* Tabela */}
      <DemandTable
        demands={result.data}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        totalPages={result.totalPages}
      />
    </div>
  );
}
