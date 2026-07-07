/**
 * demandKanbanService — Módulo 5: Kanban Operacional
 *
 * Responsável por:
 *  - Aplicar regras de visibilidade por perfil (ADMIN/GESTOR vê tudo,
 *    DEV só suas, APROVADOR só homologação+, FINANCEIRO só concluídas+)
 *  - Agrupar demandas por status em colunas ordenadas
 *  - Calcular indicadores de prazo (overdue/today/soon/ok)
 *
 * ⚠ NÃO gera comissão/RV. O valor estimado é exibido apenas como informação.
 */

import { demandRepository }    from "@/repositories/demandRepository";
import { isTechnicalRole }     from "@/lib/demand-pricing";
import { getAreasByDirector }  from "@/lib/constants/departments";
import type { UserForPermission } from "@/server/auth/permissions";
import type { DemandSummary, DemandStatus } from "@/types";
import type { KanbanFiltersInput } from "@/validations/demand";

// ── Ordenação das colunas ────────────────────────────────────────

export const KANBAN_COLUMN_ORDER: DemandStatus[] = [
  "RASCUNHO",
  "ABERTA",
  "EM_ANALISE",
  "PRIORIZACAO_DIRETORIA",
  "APROVADA",
  "EM_DESENVOLVIMENTO",
  "AGUARDANDO_HOMOLOGACAO",
  "HOMOLOGADA_PRODUCAO",
  "REPROVADA",
  "CANCELADA",
  "CONCLUIDA",
];

export const KANBAN_COLUMN_LABELS: Record<DemandStatus, string> = {
  RASCUNHO:               "Rascunho",
  ABERTA:                 "Aberta",
  EM_ANALISE:             "Em análise",
  PRIORIZACAO_DIRETORIA:  "Priori. Diretoria",
  APROVADA:               "Aprovada",
  EM_DESENVOLVIMENTO:     "Em desenvolvimento",
  AGUARDANDO_HOMOLOGACAO: "Aguard. homologação",
  HOMOLOGADA_PRODUCAO:    "Homologada",
  REPROVADA:              "Reprovada",
  CANCELADA:              "Cancelada",
  CONCLUIDA:              "Concluída",
};

// ── Visibilidade por perfil ──────────────────────────────────────

const ROLE_VISIBLE_STATUSES: Record<string, DemandStatus[]> = {
  ADMIN:       KANBAN_COLUMN_ORDER,
  DIRETOR:     KANBAN_COLUMN_ORDER,
  GESTOR:      KANBAN_COLUMN_ORDER,
  DEV:         KANBAN_COLUMN_ORDER, // filtrado por assigneeId no repositório
  SUPORTE:     KANBAN_COLUMN_ORDER, // idem
  ARQUITETO:   KANBAN_COLUMN_ORDER, // idem
  APROVADOR:   ["AGUARDANDO_HOMOLOGACAO", "HOMOLOGADA_PRODUCAO", "CONCLUIDA"],
  FINANCEIRO:  ["HOMOLOGADA_PRODUCAO", "CONCLUIDA"],
  // Solicitante vê todas as colunas das suas próprias demandas (read-only)
  SOLICITANTE: KANBAN_COLUMN_ORDER,
};

// ── Tipos públicos ────────────────────────────────────────────────

export type KanbanColumn = {
  status:  DemandStatus;
  label:   string;
  demands: DemandSummary[];
  count:   number;
};

export type KanbanBoard = {
  columns:    KanbanColumn[];
  totalCount: number;
};

// ── Indicadores de prazo ─────────────────────────────────────────

export type DeadlineStatus = "overdue" | "today" | "soon" | "ok" | "none";

export function getDeadlineStatus(
  plannedDeliveryDate: Date | null | undefined,
): DeadlineStatus {
  if (!plannedDeliveryDate) return "none";

  const now     = new Date();
  const today   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const delivery = new Date(plannedDeliveryDate);
  delivery.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((delivery.getTime() - today.getTime()) / 86_400_000);

  if (diffDays < 0)  return "overdue";
  if (diffDays === 0) return "today";
  if (diffDays <= 3) return "soon";
  return "ok";
}

// ── Service ──────────────────────────────────────────────────────

export const demandKanbanService = {
  async getKanbanBoard(
    actor: UserForPermission,
    filters: Partial<KanbanFiltersInput> = {},
  ): Promise<KanbanBoard> {
    const visibleStatuses: DemandStatus[] =
      ROLE_VISIBLE_STATUSES[actor.role] ?? KANBAN_COLUMN_ORDER;

    // Papéis técnicos: restringe por assigneeId para que só vejam as próprias
    const devFilter =
      isTechnicalRole(actor.role) ? { assigneeId: actor.id } : {};

    // Solicitante: sempre filtra pelas demandas que criou (onlyMine = creatorId)
    const forcedOnlyMine = actor.role === "SOLICITANTE" ? true : filters.onlyMine;

    const demands = await demandRepository.findKanbanDemands({
      search:         filters.search,
      statuses:       filters.statuses,
      priority:       filters.priority,
      demandType:     filters.demandType,
      assigneeId:     filters.assigneeId ?? devFilter.assigneeId,
      creatorId:      filters.creatorId,
      requesterArea:  filters.requesterArea,
      requesterAreas: filters.director ? getAreasByDirector(filters.director) : undefined,
      requesterName:  filters.requesterName,
      complexity:     filters.complexity,
      roi:            filters.roi,
      deadlineStatus: filters.deadlineStatus,
      deliveryFrom:   filters.deliveryFrom,
      deliveryTo:     filters.deliveryTo,
      onlyMine:       forcedOnlyMine,
      currentUserId:  actor.id,
      visibleStatuses,
      sortBy:         filters.sortBy,
    });

    // Agrupa por status mantendo a ordem das colunas
    const grouped = new Map<DemandStatus, DemandSummary[]>();
    for (const status of visibleStatuses) {
      grouped.set(status, []);
    }
    for (const d of demands) {
      const col = grouped.get(d.status);
      if (col) col.push(d);
    }

    // Coluna PRIORIZACAO_DIRETORIA: ordenar por directorPriorityOrder asc (nulls last)
    const dirCol = grouped.get("PRIORIZACAO_DIRETORIA");
    if (dirCol) {
      dirCol.sort((a, b) => {
        const ao = a.directorPriorityOrder ?? Infinity;
        const bo = b.directorPriorityOrder ?? Infinity;
        return ao - bo;
      });
    }

    // Filtra colunas pela seleção do usuário (se especificada)
    const targetStatuses =
      filters.statuses && filters.statuses.length > 0
        ? visibleStatuses.filter((s) => filters.statuses!.includes(s))
        : visibleStatuses;

    const columns: KanbanColumn[] = targetStatuses.map((status) => {
      const col = grouped.get(status) ?? [];
      return {
        status,
        label:   KANBAN_COLUMN_LABELS[status],
        demands: col,
        count:   col.length,
      };
    });

    return {
      columns,
      totalCount: demands.length,
    };
  },
};
