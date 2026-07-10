"use client";

import Link from "next/link";
import type { DemandSummary }       from "@/types";
import type { UserForPermission }   from "@/server/auth/permissions";
import {
  canChangeDemandStatus,
  canHomologateDemand,
  canPrioritizeDemand,
  canReturnApprovedToAnalysis,
} from "@/server/auth/permissions";
import { PriorityBadge }   from "@/components/demandas/priority-badge";
import { TypeBadge }       from "@/components/demandas/type-badge";
import { DirectorBadge }   from "@/components/demandas/director-badge";
import { DeadlineBadge }   from "./deadline-badge";
import { EstimatedValueBadge } from "./estimated-value-badge";
import { COMPLEXITY_LABELS }   from "@/lib/demand-pricing";
import { calculateBenchmarkEconomy } from "@/lib/benchmark/calculateBenchmarkEconomy";
import { cn }     from "@/lib/utils";
import { User2, Clock, ExternalLink } from "lucide-react";
import type { ComplexityLevel } from "@prisma/client";

// ── Ações rápidas disponíveis no card ──────────────────────────────

import {
  ConfirmTransitionDialog,
  SendToAnalysisDialog,
  StartDevelopmentDialog,
  SendToHomologationDialog,
  HomologateDialog,
  RejectDemandDialog,
  CancelDemandDialog,
  PrioritizeAndApproveDialog,
  ReturnFromDirectorDialog,
  ReturnApprovedToAnalysisDialog,
} from "@/components/demandas/workflow-dialogs";
import { Button } from "@/components/ui/button";
import {
  FolderOpen, FlaskConical, Code2,
  Send, ShieldCheck, XCircle, RotateCcw, Ban, Star, Undo2, TrendingDown, CheckCircle2,
} from "lucide-react";

const BRL_COMPACT = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

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
  const canOpen               = demand.status === "RASCUNHO"               && canChangeDemandStatus(actor, demandPerm, "ABERTA");
  const canAnalysis           = demand.status === "ABERTA"                 && canChangeDemandStatus(actor, demandPerm, "EM_ANALISE");
  // EM_ANALISE → "Enviar para diretoria" (nunca "Aprovar" diretamente)
  const canSendToDirector     = demand.status === "EM_ANALISE"             && canChangeDemandStatus(actor, demandPerm, "PRIORIZACAO_DIRETORIA");
  // PRIORIZACAO_DIRETORIA → ADMIN/DIRETOR podem priorizar, aprovar ou devolver
  const canPrioritizeApprove  = demand.status === "PRIORIZACAO_DIRETORIA"  && canPrioritizeDemand(actor);
  const canStart              = demand.status === "APROVADA"               && canChangeDemandStatus(actor, demandPerm, "EM_DESENVOLVIMENTO");
  const canHomologation       = demand.status === "EM_DESENVOLVIMENTO"     && canChangeDemandStatus(actor, demandPerm, "AGUARDANDO_HOMOLOGACAO");
  const canHomologate         = demand.status === "AGUARDANDO_HOMOLOGACAO" && canHomologateDemand(actor, demandPerm);
  const canReject             = demand.status === "AGUARDANDO_HOMOLOGACAO" && canChangeDemandStatus(actor, demandPerm, "REPROVADA");
  const canReturn             = (demand.status === "REPROVADA" || demand.status === "AGUARDANDO_HOMOLOGACAO")
                                && canChangeDemandStatus(actor, demandPerm, "EM_DESENVOLVIMENTO");
  const canCancel             = ["RASCUNHO","ABERTA","EM_ANALISE","PRIORIZACAO_DIRETORIA","APROVADA","EM_DESENVOLVIMENTO"].includes(demand.status)
                                && canChangeDemandStatus(actor, demandPerm, "CANCELADA");
  const canReturnApproved     = ["APROVADA", "EM_DESENVOLVIMENTO"].includes(demand.status) && canReturnApprovedToAnalysis(actor);

  // canPrioritizeApprove e canReturnFromDirector são exibidos no painel dedicado da diretoria
  const hasActions = canOpen || canAnalysis || canSendToDirector || canStart || canReturnApproved ||
                     canHomologation || canHomologate || canReject || canReturn || canCancel;

  const benchEconomy = (
    (actor.role === "ADMIN" || actor.role === "DIRETOR" || actor.role === "GESTOR") &&
    demand.estimatedHours != null && demand.estimatedHours > 0 &&
    demand.assigneeProfileSnapshot != null
  )
    ? calculateBenchmarkEconomy({
        estimatedHours: demand.estimatedHours,
        workerProfile:  demand.assigneeProfileSnapshot,
        ourHourlyRate:  demand.hourlyRateSnapshot ?? undefined,
        ourValue:       demand.estimatedDemandValue ?? undefined,
      })
    : null;

  return (
    <div
      className={cn(
        "group flex flex-col gap-2 rounded-lg border bg-background p-3 shadow-sm",
        "hover:shadow-md hover:border-brand-primary/30 transition-all duration-150",
      )}
    >
      {/* Linha 1: Prioridade + Tipo + Diretor */}
      <div className="flex flex-wrap items-center gap-1.5">
        <PriorityBadge priority={demand.priority} showIcon />
        <TypeBadge     type={demand.demandType} />
        <DirectorBadge requesterArea={demand.requesterArea} />
      </div>

      {/* Linha 2: Título */}
      <Link
        href={`/demandas/${demand.id}`}
        className="text-sm font-semibold text-brand-text-dark leading-snug hover:text-brand-primary hover:underline line-clamp-2"
      >
        {demand.title}
      </Link>

      {/* Linha 3: Área + ID + Ordem Diretoria */}
      <div className="flex items-center gap-1.5 min-w-0">
        <p className="text-[11px] text-muted-foreground truncate flex-1">
          {demand.requesterArea}
          <span className="ml-1.5 font-mono opacity-60">
            #{demand.id.slice(-6).toUpperCase()}
          </span>
        </p>
        {demand.directorPriorityOrder != null && (
          <span className="inline-flex items-center gap-0.5 shrink-0 rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
            <Star className="h-2.5 w-2.5" />
            {demand.directorPriorityOrder}
          </span>
        )}
      </div>

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

      {/* Linha 5: Prazo + Valor estimado (oculto para Solicitante) */}
      <div className="flex flex-wrap items-center gap-1.5">
        <DeadlineBadge date={demand.plannedDeliveryDate} />
        {actor.role !== "SOLICITANTE" && (
          <EstimatedValueBadge value={demand.estimatedDemandValue} />
        )}
        {/* Badge de economia (só ADMIN/DIRETOR/GESTOR) */}
        {benchEconomy != null && benchEconomy.economy > 0 && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
            <TrendingDown className="h-2.5 w-2.5" />
            {BRL_COMPACT.format(benchEconomy.economy)}
          </span>
        )}
      </div>

      {/* ── Painel de priorização da diretoria ─────────────────────── */}
      {demand.status === "PRIORIZACAO_DIRETORIA" && (
        <div className="rounded-md border border-indigo-200 bg-indigo-50/70 px-2.5 py-2 space-y-1.5">
          {/* Status da prioridade */}
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-semibold text-indigo-700">Priorização Diretoria</span>
            {demand.directorPriorityOrder != null ? (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white">
                <Star className="h-2.5 w-2.5" />
                #{demand.directorPriorityOrder}
              </span>
            ) : (
              <span className="text-[10px] text-indigo-400 italic">Aguardando priorização</span>
            )}
          </div>
          {/* Botões de ação — apenas ADMIN/DIRETOR */}
          {canPrioritizeApprove && (
            <div className="flex flex-wrap gap-1">
              <PrioritizeAndApproveDialog
                demandId={demand.id}
                trigger={
                  <Button size="sm" className="h-7 px-2.5 text-[11px] gap-1 bg-indigo-600 hover:bg-indigo-700 text-white flex-1 min-w-0">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    Aprovar
                  </Button>
                }
              />
              <ReturnFromDirectorDialog
                demandId={demand.id}
                trigger={
                  <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] gap-1 border-amber-300 text-amber-700 hover:bg-amber-50">
                    <Undo2 className="h-3 w-3" /> Devolver
                  </Button>
                }
              />
            </div>
          )}
        </div>
      )}

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
            <SendToAnalysisDialog
              demandId={demand.id}
              initialData={{
                assigneeId:     demand.assignee?.id ?? null,
                estimatedHours: demand.estimatedHours,
                complexity:     demand.complexity,
                roi:            demand.roi,
              }}
              trigger={
                <Button variant="outline" size="sm" className="h-6 px-2 text-[10px] gap-1">
                  <FlaskConical className="h-3 w-3" /> Análise
                </Button>
              }
            />
          )}
          {canSendToDirector && (
            <ConfirmTransitionDialog
              demandId={demand.id} action="sendToDirector"
              title="Enviar para diretoria"
              description="A demanda será encaminhada para priorização e aprovação pela diretoria."
              confirmLabel="Enviar para diretoria"
              trigger={
                <Button size="sm" className="h-6 px-2 text-[10px] gap-1 bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Send className="h-3 w-3" /> Diretoria
                </Button>
              }
            />
          )}
          {canReturnApproved && (
            <ReturnApprovedToAnalysisDialog
              demandId={demand.id}
              trigger={
                <Button variant="outline" size="sm" className="h-6 px-2 text-[10px] gap-1 border-amber-300 text-amber-700 hover:bg-amber-50">
                  <Undo2 className="h-3 w-3" /> Devolver
                </Button>
              }
            />
          )}
          {canStart && (
            <StartDevelopmentDialog
              demandId={demand.id}
              allowPastDates={actor.role === "GESTOR" || actor.role === "ADMIN"}
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
