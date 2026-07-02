"use client";

/**
 * DemandKanbanBoard — Módulo 5 (com Drag & Drop)
 *
 * Board interativo com arrastar-e-soltar entre colunas.
 * Usa @dnd-kit/core para DnD acessível e compatível com touch.
 *
 * Fluxo:
 *  1. Usuário arrasta um card
 *  2. @dnd-kit valida o drop sobre uma coluna
 *  3. Se a transição for válida (ALLOWED_TRANSITIONS + permissão), move o card
 *     otimisticamente e abre o diálogo correspondente
 *  4. Se o usuário confirmar → Server Action → router.refresh()
 *  5. Se o usuário cancelar → card reverte para a coluna original
 */

import { useState, useCallback, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import type { KanbanBoard, KanbanColumn as KanbanColumnType } from "@/services/demandKanbanService";
import type { UserForPermission }  from "@/server/auth/permissions";
import { canChangeDemandStatus, canHomologateDemand } from "@/server/auth/permissions";
import { ALLOWED_TRANSITIONS }     from "@/validations/demand";
import type { DemandSummary, DemandStatus } from "@/types";
import { DemandKanbanCard }        from "./demand-kanban-card";
import { DropTransitionDialog, type PendingDrop } from "./drop-transition-dialog";
import { STATUS_CONFIG }           from "@/components/demandas/status-badge";
import { cn }                      from "@/lib/utils";
import { GripVertical }            from "lucide-react";

// ── Utilitários de permissão ──────────────────────────────────────

function canTransition(
  from: DemandStatus,
  to:   DemandStatus,
  demand: DemandSummary,
  actor: UserForPermission,
): boolean {
  // 1. A transição deve existir no mapa de transições permitidas
  if (!ALLOWED_TRANSITIONS[from]?.includes(to)) return false;

  const demandPerm = {
    id:         demand.id,
    creatorId:  demand.creator.id,
    assigneeId: demand.assignee?.id ?? null,
    status:     demand.status,
  };

  // 2. Homologação tem regra especial (sem auto-homologação)
  if (to === "HOMOLOGADA_PRODUCAO") {
    return canHomologateDemand(actor, demandPerm);
  }

  return canChangeDemandStatus(actor, demandPerm, to);
}

// ── Cor do cabeçalho por status ───────────────────────────────────

const COLUMN_ACCENT: Record<string, string> = {
  RASCUNHO:               "border-t-slate-400",
  ABERTA:                 "border-t-blue-500",
  EM_ANALISE:             "border-t-amber-500",
  PRIORIZACAO_DIRETORIA:  "border-t-indigo-500",
  APROVADA:               "border-t-emerald-500",
  EM_DESENVOLVIMENTO:     "border-t-brand-primary",
  AGUARDANDO_HOMOLOGACAO: "border-t-orange-500",
  HOMOLOGADA_PRODUCAO:    "border-t-green-600",
  REPROVADA:              "border-t-red-500",
  CANCELADA:              "border-t-slate-400",
  CONCLUIDA:              "border-t-emerald-700",
};

// ── DraggableCard ─────────────────────────────────────────────────

function DraggableCard({
  demand,
  actor,
  isDragOverlay = false,
}: {
  demand: DemandSummary;
  actor:  UserForPermission;
  isDragOverlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id:   demand.id,
    data: { demand },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity:   isDragging ? 0.3 : 1,
    cursor:    isDragging ? "grabbing" : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={isDragOverlay ? undefined : style}
      className={cn(
        "relative",
        isDragOverlay && "rotate-1 shadow-2xl opacity-95",
      )}
    >
      {/* Alça de drag */}
      <div
        {...attributes}
        {...listeners}
        suppressHydrationWarning
        className={cn(
          "absolute left-0 top-0 bottom-0 w-5 flex items-center justify-center",
          "cursor-grab active:cursor-grabbing rounded-l-lg",
          "text-muted-foreground/30 hover:text-muted-foreground/60 hover:bg-muted/40",
          "transition-colors touch-none",
        )}
        aria-label="Arrastar demanda"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>

      {/* Card (com margem à esquerda para a alça) */}
      <div className="pl-5">
        <DemandKanbanCard demand={demand} actor={actor} />
      </div>
    </div>
  );
}

// ── DroppableColumn ───────────────────────────────────────────────

function DroppableColumn({
  column,
  actor,
  activeId,
  activeDemand,
}: {
  column:        KanbanColumnType;
  actor:         UserForPermission;
  activeId:      UniqueIdentifier | null;
  activeDemand:  DemandSummary | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.status });
  const cfg = STATUS_CONFIG[column.status];

  // Descobre se o item sendo arrastado pode ser solto aqui
  const canDrop = activeDemand
    ? canTransition(activeDemand.status, column.status as DemandStatus, activeDemand, actor)
    : false;

  const isActive = !!activeId;

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border border-border bg-muted/30",
        "border-t-2 min-w-[260px] max-w-[280px] w-[270px] shrink-0",
        "transition-all duration-150",
        COLUMN_ACCENT[column.status] ?? "border-t-slate-300",
        // Destaque quando o item pode ser solto aqui
        isActive && canDrop  && isOver  && "ring-2 ring-brand-primary bg-brand-bg-light/40 border-brand-primary/50",
        isActive && canDrop  && !isOver && "ring-1 ring-brand-primary/30 bg-muted/50",
        isActive && !canDrop && "opacity-50 cursor-not-allowed",
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

      {/* Zona de drop */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-col gap-2 p-2 flex-1",
          "overflow-y-auto max-h-[calc(100vh-260px)] scrollbar-thin",
          "transition-colors duration-100",
          isOver && canDrop && "bg-brand-primary/5 rounded-b-lg",
        )}
      >
        {column.demands.length === 0 && !isOver ? (
          <p className="text-center text-xs text-muted-foreground py-6 opacity-60">
            Nenhuma demanda
          </p>
        ) : (
          column.demands.map((demand) => (
            <DraggableCard
              key={demand.id}
              demand={demand}
              actor={actor}
            />
          ))
        )}

        {/* Indicador visual de drop */}
        {isOver && canDrop && (
          <div className="rounded-lg border-2 border-dashed border-brand-primary/40 bg-brand-primary/5 h-20 flex items-center justify-center">
            <p className="text-xs text-brand-primary font-medium">Soltar aqui → {column.label}</p>
          </div>
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
  // Estado local para updates otimistas
  const [columns, setColumns] = useState<KanbanColumnType[]>(board.columns);

  // Sincroniza quando o servidor re-renderiza (após router.refresh)
  useEffect(() => {
    setColumns(board.columns);
  }, [board]);

  const [activeId, setActiveId]         = useState<UniqueIdentifier | null>(null);
  const [activeDemand, setActiveDemand] = useState<DemandSummary | null>(null);
  const [pendingDrop, setPendingDrop]   = useState<PendingDrop | null>(null);

  // Estado para reverter se o usuário cancelar o diálogo
  const [revertSnapshot, setRevertSnapshot] = useState<KanbanColumnType[] | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  // Encontra a demanda em qualquer coluna
  const findDemand = useCallback(
    (id: UniqueIdentifier) => {
      for (const col of columns) {
        const d = col.demands.find((x) => x.id === id);
        if (d) return d;
      }
      return null;
    },
    [columns],
  );

  // Encontra a coluna de uma demanda
  const findDemandColumn = useCallback(
    (id: UniqueIdentifier) => {
      return columns.find((col) => col.demands.some((d) => d.id === id)) ?? null;
    },
    [columns],
  );

  function onDragStart(event: DragStartEvent) {
    const demand = findDemand(event.active.id);
    setActiveId(event.active.id);
    setActiveDemand(demand ?? null);
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !activeDemand) {
      setActiveDemand(null);
      return;
    }

    const fromCol = findDemandColumn(active.id);
    const toStatus = over.id as DemandStatus;

    // Nada mudou
    if (!fromCol || fromCol.status === toStatus) {
      setActiveDemand(null);
      return;
    }

    // Verifica permissão
    if (!canTransition(fromCol.status, toStatus, activeDemand, actor)) {
      setActiveDemand(null);
      return;
    }

    // Snapshot para reverter se o usuário cancelar
    setRevertSnapshot(columns.map((col) => ({ ...col, demands: [...col.demands] })));

    // Move otimisticamente
    setColumns((prev) =>
      prev.map((col) => {
        if (col.status === fromCol.status) {
          return { ...col, demands: col.demands.filter((d) => d.id !== active.id), count: col.count - 1 };
        }
        if (col.status === toStatus) {
          return { ...col, demands: [...col.demands, { ...activeDemand, status: toStatus }], count: col.count + 1 };
        }
        return col;
      }),
    );

    // Abre diálogo correspondente
    setPendingDrop({
      demandId:    activeDemand.id,
      demandTitle: activeDemand.title,
      fromStatus:  fromCol.status,
      toStatus,
    });

    setActiveDemand(null);
  }

  function handleDropSuccess() {
    setRevertSnapshot(null);
    setPendingDrop(null);
    // O router.refresh() é chamado no DropTransitionDialog após sucesso
  }

  function handleDropCancel() {
    // Reverte para o estado antes do drag
    if (revertSnapshot) {
      setColumns(revertSnapshot);
    }
    setRevertSnapshot(null);
    setPendingDrop(null);
  }

  if (columns.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed p-12">
        <p className="text-sm text-muted-foreground">Nenhuma coluna disponível para o seu perfil.</p>
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-max">
            {columns.map((column) => (
              <DroppableColumn
                key={column.status}
                column={column}
                actor={actor}
                activeId={activeId}
                activeDemand={activeDemand}
              />
            ))}
          </div>
        </div>

        {/* Overlay: o card "fantasma" que segue o cursor */}
        <DragOverlay dropAnimation={{ duration: 150, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
          {activeDemand ? (
            <DraggableCard
              demand={activeDemand}
              actor={actor}
              isDragOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Diálogo de confirmação/formulário disparado pelo drop */}
      <DropTransitionDialog
        pending={pendingDrop}
        onSuccess={handleDropSuccess}
        onCancel={handleDropCancel}
        allowPastDates={actor.role === "GESTOR" || actor.role === "ADMIN"}
      />
    </>
  );
}
