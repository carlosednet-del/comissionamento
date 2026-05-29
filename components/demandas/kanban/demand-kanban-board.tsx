/**
 * DemandKanbanBoard — Módulo 5
 *
 * Server Component que renderiza o board com colunas por status.
 * Aceita o board pré-computado do demandKanbanService.
 *
 * Layout:
 *  - Desktop (≥1280px): scroll horizontal com colunas de largura fixa
 *  - Tablet  (768–1280px): grid 3 ou 4 colunas
 *  - Mobile  (<768px): lista agrupada por status, colapsável
 */

import type { KanbanBoard, KanbanColumn } from "@/services/demandKanbanService";
import type { UserForPermission }         from "@/server/auth/permissions";
import { DemandKanbanCard }               from "./demand-kanban-card";
import { STATUS_CONFIG }                  from "@/components/demandas/status-badge";
import { cn } from "@/lib/utils";

// ── Cor do cabeçalho da coluna por status ────────────────────────

const COLUMN_HEADER_STYLE: Record<string, string> = {
  RASCUNHO:               "border-t-slate-400",
  ABERTA:                 "border-t-blue-500",
  EM_ANALISE:             "border-t-amber-500",
  APROVADA:               "border-t-emerald-500",
  EM_DESENVOLVIMENTO:     "border-t-brand-primary",
  AGUARDANDO_HOMOLOGACAO: "border-t-orange-500",
  HOMOLOGADA_PRODUCAO:    "border-t-green-600",
  REPROVADA:              "border-t-red-500",
  CANCELADA:              "border-t-slate-400",
  CONCLUIDA:              "border-t-emerald-700",
};

// ── Coluna individual ─────────────────────────────────────────────

function KanbanColumn({ column, actor }: { column: KanbanColumn; actor: UserForPermission }) {
  const headerStyle = COLUMN_HEADER_STYLE[column.status] ?? "border-t-slate-300";
  const cfg         = STATUS_CONFIG[column.status];

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border border-border bg-muted/30",
        "border-t-2 min-w-[260px] max-w-[280px] w-[270px] shrink-0",
        headerStyle,
      )}
    >
      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b">
        <span className="text-xs font-semibold text-brand-text-dark">{column.label}</span>
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-[10px] font-bold",
            cfg?.style ?? "bg-slate-100 text-slate-600 border-slate-200",
          )}
        >
          {column.count}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 p-2 overflow-y-auto max-h-[calc(100vh-260px)] scrollbar-thin">
        {column.demands.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-6 opacity-60">
            Nenhuma demanda
          </p>
        ) : (
          column.demands.map((demand) => (
            <DemandKanbanCard
              key={demand.id}
              demand={demand}
              actor={actor}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Board principal ───────────────────────────────────────────────

type Props = {
  board: KanbanBoard;
  actor: UserForPermission;
};

export function DemandKanbanBoard({ board, actor }: Props) {
  if (board.columns.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed p-12">
        <p className="text-sm text-muted-foreground">Nenhuma coluna disponível para o seu perfil.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-3 min-w-max">
        {board.columns.map((column) => (
          <KanbanColumn key={column.status} column={column} actor={actor} />
        ))}
      </div>
    </div>
  );
}
