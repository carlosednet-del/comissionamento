"use client";

import Link from "next/link";
import type { DemandSummary }       from "@/types";
import type { UserForPermission }   from "@/server/auth/permissions";
import {
  canChangeDemandStatus,
  canHomologateDemand,
} from "@/server/auth/permissions";
import { PriorityBadge }   from "@/components/demandas/priority-badge";
import { TypeBadge }       from "@/components/demandas/type-badge";
import { DeadlineBadge }   from "./deadline-badge";
import { EstimatedValueBadge } from "./estimated-value-badge";
import { COMPLEXITY_LABELS }   from "@/lib/demand-pricing";
import { cn }     from "@/lib/utils";
import { User2, Clock, ExternalLink } from "lucide-react";
import type { ComplexityLevel } from "@prisma/client";

// ── Ações rápidas disponíveis no card ──────────────────────────────

import {
  ConfirmTransitionDialog,
  SendToHomologationDialog,
  HomologateDialog,
  RejectDemandDialog,
  CancelDemandDialog,
} from "@/components/demandas/workflow-dialogs";
import { Button } from "@/components/ui/button";
import {
  FolderOpen, FlaskConical, CheckCircle2, Code2,
  Send, ShieldCheck, XCircle, RotateCcw, Ban,
} from "lucide-react";

// ── Props ─────────────────────────────────────────────────────────

type Props = {
  demand: DemandSummary;
  actor:  UserForPermission;
  evidenceCount?: number; // para SendToHomologationDialog
};

// ── Componente ────────────────────────────────────────────────────

export function DemandKanbanCard({ demand, actor, evidenceCount = 0 }: Props) {
  const demandPerm = {
    id:         demand.id,
    creatorId:  demand.creator.id,
    assigneeId: demand.assignee?.id ?? null,
    status:     demand.status,
  };

  // Ações disponíveis para este actor neste card
  const canOpen        = demand.status === "RASCUNHO"               && canChangeDemandStatus(actor, demandPerm, "ABERTA");
  const canAnalysis    = demand.status === "ABERTA"                 && canChangeDemandStatus(actor, demandPerm, "EM_ANALISE");
  const canApprove     = demand.status === "EM_ANALISE"             && canChangeDemandStatus(actor, demandPerm, "APROVADA");
  const canStart       = demand.status === "APROVADA"               && canChangeDemandStatus(actor, demandPerm, "EM_DESENVOLVIMENTO");
  const canHomologation= demand.status === "EM_DESENVOLVIMENTO"     && canChangeDemandStatus(actor, demandPerm, "AGUARDANDO_HOMOLOGACAO");
  const canHomologate  = demand.status === "AGUARDANDO_HOMOLOGACAO" && canHomologateDemand(actor, demandPerm);
  const canReject      = demand.status === "AGUARDANDO_HOMOLOGACAO" && canChangeDemandStatus(actor, demandPerm, "REPROVADA");
  const canReturn      = (demand.status === "REPROVADA" || demand.status === "AGUARDANDO_HOMOLOGACAO")
                         && canChangeDemandStatus(actor, demandPerm, "EM_DESENVOLVIMENTO");
  const canCancel      = ["RASCUNHO","ABERTA","EM_ANALISE","APROVADA","EM_DESENVOLVIMENTO"].includes(demand.status)
                         && canChangeDemandStatus(actor, demandPerm, "CANCELADA");

  const hasActions = canOpen || canAnalysis || canApprove || canStart ||
                     canHomologation || canHomologate || canReject || canReturn || canCancel;

  return (
    <div
      className={cn(
        "group flex flex-col gap-2 rounded-lg border bg-background p-3 shadow-sm",
        "hover:shadow-md hover:border-brand-primary/30 transition-all duration-150",
      )}
    >
      {/* Linha 1: Prioridade + Tipo */}
      <div className="flex flex-wrap items-center gap-1.5">
        <PriorityBadge priority={demand.priority} showIcon />
        <TypeBadge     type={demand.demandType} />
      </div>

      {/* Linha 2: Título */}
      <Link
        href={`/demandas/${demand.id}`}
        className="text-sm font-semibold text-brand-text-dark leading-snug hover:text-brand-primary hover:underline line-clamp-2"
      >
        {demand.title}
      </Link>

      {/* Linha 3: Área + ID */}
      <p className="text-[11px] text-muted-foreground truncate">
        {demand.requesterArea}
        <span className="ml-1.5 font-mono opacity-60">
          #{demand.id.slice(-6).toUpperCase()}
        </span>
      </p>

      {/* Linha 4: Responsável + horas */}
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        {demand.assignee && (
          <span className="flex items-center gap-1">
            <User2 className="h-3 w-3" />
            {demand.assignee.name}
          </span>
        )}
        {demand.estimatedHours != null && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {demand.estimatedHours}h
          </span>
        )}
        {demand.complexity && (
          <span>{COMPLEXITY_LABELS[demand.complexity as ComplexityLevel]}</span>
        )}
      </div>

      {/* Linha 5: Prazo + Valor estimado */}
      <div className="flex flex-wrap items-center gap-1.5">
        <DeadlineBadge date={demand.plannedDeliveryDate} />
        <EstimatedValueBadge value={demand.estimatedDemandValue} />
      </div>

      {/* Linha 6: Ações rápidas */}
      {hasActions && (
        <div className="flex flex-wrap gap-1 pt-1 border-t border-dashed">
          {canOpen && (
            <ConfirmTransitionDialog
              demandId={demand.id} action="open"
              title="Abrir demanda"
              description="A demanda será publicada e ficará visível para análise."
              confirmLabel="Abrir"
              trigger={
                <Button variant="outline" size="sm" className="h-6 px-2 text-[10px] gap-1">
                  <FolderOpen className="h-3 w-3" /> Abrir
                </Button>
              }
            />
          )}
          {canAnalysis && (
            <ConfirmTransitionDialog
              demandId={demand.id} action="analysis"
              title="Enviar para análise"
              description="A demanda será movida para análise técnica."
              confirmLabel="Enviar"
              trigger={
                <Button variant="outline" size="sm" className="h-6 px-2 text-[10px] gap-1">
                  <FlaskConical className="h-3 w-3" /> Análise
                </Button>
              }
            />
          )}
          {canApprove && (
            <ConfirmTransitionDialog
              demandId={demand.id} action="approve"
              title="Aprovar demanda"
              description="A demanda será aprovada e liberada para desenvolvimento."
              confirmLabel="Aprovar"
              trigger={
                <Button size="sm" className="h-6 px-2 text-[10px] gap-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                  <CheckCircle2 className="h-3 w-3" /> Aprovar
                </Button>
              }
            />
          )}
          {canStart && (
            <ConfirmTransitionDialog
              demandId={demand.id} action="start"
              title="Iniciar desenvolvimento"
              description="O desenvolvimento será iniciado. A data de início real será registrada."
              confirmLabel="Iniciar"
              trigger={
                <Button size="sm" className="h-6 px-2 text-[10px] gap-1 bg-purple-600 hover:bg-purple-700 text-white">
                  <Code2 className="h-3 w-3" /> Iniciar
                </Button>
              }
            />
          )}
          {canHomologation && (
            <SendToHomologationDialog
              demandId={demand.id}
              evidenceCount={evidenceCount}
              trigger={
                <Button size="sm" className="h-6 px-2 text-[10px] gap-1 bg-orange-500 hover:bg-orange-600 text-white">
                  <Send className="h-3 w-3" /> Homolog.
                </Button>
              }
            />
          )}
          {canHomologate && (
            <HomologateDialog
              demandId={demand.id}
              trigger={
                <Button size="sm" className="h-6 px-2 text-[10px] gap-1 bg-green-600 hover:bg-green-700 text-white">
                  <ShieldCheck className="h-3 w-3" /> Homologar
                </Button>
              }
            />
          )}
          {canReject && (
            <RejectDemandDialog
              demandId={demand.id}
              trigger={
                <Button variant="destructive" size="sm" className="h-6 px-2 text-[10px] gap-1">
                  <XCircle className="h-3 w-3" /> Reprovar
                </Button>
              }
            />
          )}
          {canReturn && (
            <ConfirmTransitionDialog
              demandId={demand.id} action="return"
              title="Retornar para desenvolvimento"
              description="A demanda voltará para o desenvolvedor responsável."
              confirmLabel="Retornar"
              trigger={
                <Button variant="outline" size="sm" className="h-6 px-2 text-[10px] gap-1">
                  <RotateCcw className="h-3 w-3" /> Retornar
                </Button>
              }
            />
          )}
          {canCancel && (
            <CancelDemandDialog
              demandId={demand.id}
              trigger={
                <Button variant="outline" size="sm" className="h-6 px-2 text-[10px] gap-1 text-destructive border-destructive/40 hover:bg-destructive/5">
                  <Ban className="h-3 w-3" /> Cancelar
                </Button>
              }
            />
          )}
        </div>
      )}

      {/* Link para detalhe */}
      <Link
        href={`/demandas/${demand.id}`}
        className="flex items-center gap-1 text-[10px] text-brand-primary hover:underline mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <ExternalLink className="h-3 w-3" />
        Ver detalhes
      </Link>
    </div>
  );
}
