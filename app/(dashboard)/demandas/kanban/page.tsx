import Link from "next/link";
import { requireAuth, toPermissionUser } from "@/server/auth/helpers";
import { demandKanbanService }           from "@/services/demandKanbanService";
import { DemandKanbanBoard }             from "@/components/demandas/kanban/demand-kanban-board";
import { DemandKanbanFilters }           from "@/components/demandas/kanban/demand-kanban-filters";
import { Button }  from "@/components/ui/button";
import { LayoutList, LayoutGrid } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { DEPARTMENTS } from "@/lib/constants/departments";
import type { DemandPriority, DemandType, ComplexityLevel, RoiLevel } from "@prisma/client";
import { Suspense } from "react";

export const metadata = { title: "Kanban — Gestor de Demandas" };

type SearchParams = {
  search?:        string;
  priority?:      string;
  demandType?:    string;
  complexity?:    string;
  roi?:           string;
  deadlineStatus?: string;
  sortBy?:        string;
  onlyMine?:      string;
  assigneeId?:    string;
  requesterName?: string;
  requesterArea?: string;
  director?:      string;
};

export type KanbanAssignee = { id: string; name: string; role: string };

function KanbanSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden pb-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-border bg-muted/30 min-w-[260px] w-[270px] shrink-0 animate-pulse"
          style={{ height: 420 }}
        />
      ))}
    </div>
  );
}

async function KanbanContent({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireAuth();
  const actor   = toPermissionUser(session);
  const sp      = searchParams;

  const board = await demandKanbanService.getKanbanBoard(actor, {
    search:         sp.search        || undefined,
    priority:       (sp.priority      as DemandPriority)  || undefined,
    demandType:     (sp.demandType    as DemandType)       || undefined,
    complexity:     (sp.complexity    as ComplexityLevel)  || undefined,
    roi:            (sp.roi           as RoiLevel)         || undefined,
    deadlineStatus: (sp.deadlineStatus as "overdue" | "today" | "soon" | "ok") || undefined,
    sortBy:         (sp.sortBy as "priority" | "deadline" | "created" | "title") || undefined,
    onlyMine:       sp.onlyMine === "true",
    assigneeId:     sp.assigneeId    || undefined,
    requesterName:  sp.requesterName || undefined,
    requesterArea:  sp.requesterArea || undefined,
    director:       sp.director      || undefined,
  });

  return <DemandKanbanBoard board={board} actor={actor} />;
}

export default async function KanbanPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireAuth();
  const actor   = toPermissionUser(session);
  const sp      = await searchParams;

  // SOLICITANTE e papéis com filtro automático não precisam do toggle
  const showMyDemandsToggle =
    actor.role !== "FINANCEIRO" &&
    actor.role !== "APROVADOR" &&
    actor.role !== "SOLICITANTE"; // sempre vê só as suas próprias

  // Filtro de responsável só faz sentido para quem enxerga todos (ADMIN / GESTOR / APROVADOR / FINANCEIRO)
  const showAssigneeFilter =
    actor.role === "ADMIN"    || actor.role === "GESTOR" ||
    actor.role === "APROVADOR" || actor.role === "FINANCEIRO";

  // Lista de usuários assignáveis para o dropdown de responsável
  const assignees: KanbanAssignee[] = showAssigneeFilter
    ? await prisma.user.findMany({
        where: {
          role:     { in: ["DEV", "GESTOR", "ARQUITETO", "SUPORTE"] },
          isActive: true,
        },
        select: { id: true, name: true, role: true },
        orderBy: { name: "asc" },
      })
    : [];

  const requesterAreas = [...DEPARTMENTS];

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-text-dark">Kanban</h1>
          <p className="text-sm text-muted-foreground">
            Visualização do fluxo operacional de demandas por status.
          </p>
        </div>

        {/* Alternância lista ↔ kanban */}
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/demandas">
              <LayoutList className="mr-1.5 h-4 w-4" />
              Lista
            </Link>
          </Button>
          <Button size="sm" disabled>
            <LayoutGrid className="mr-1.5 h-4 w-4" />
            Kanban
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <DemandKanbanFilters
        showMyDemandsToggle={showMyDemandsToggle}
        showAssigneeFilter={showAssigneeFilter}
        assignees={assignees}
        requesterAreas={requesterAreas}
      />

      {/* Board */}
      <Suspense fallback={<KanbanSkeleton />}>
        <KanbanContent searchParams={sp} />
      </Suspense>
    </div>
  );
}
