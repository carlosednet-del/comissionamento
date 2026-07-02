"use client";

/**
 * WorkflowSection — Módulo 4
 *
 * Exibe o progresso do workflow, o status atual em destaque,
 * e os botões de ação disponíveis para o actor logado.
 */

import type { DemandWithRelations } from "@/types";
import type { UserForPermission }   from "@/server/auth/permissions";
import { canChangeDemandStatus, canHomologateDemand, canPrioritizeDemand } from "@/server/auth/permissions";
import type { DemandStatus }        from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button }   from "@/components/ui/button";
import { cn }       from "@/lib/utils";
import { STATUS_CONFIG } from "./status-badge";
import {
  ConfirmTransitionDialog,
  StartDevelopmentDialog,
  SendToHomologationDialog,
  HomologateDialog,
  RejectDemandDialog,
  CancelDemandDialog,
  PrioritizeAndApproveDialog,
  ReturnFromDirectorDialog,
} from "./workflow-dialogs";
import {
  FolderOpen,
  FlaskConical,
  CheckCircle2,
  Code2,
  Send,
  ShieldCheck,
  XCircle,
  RotateCcw,
  Ban,
  Star,
  Undo2,
} from "lucide-react";

// ── Configuração dos botões de ação ──────────────────────────────

type ActionType =
  | "open" | "analysis" | "approve" | "start"
  | "homologation" | "homologate" | "reject" | "return" | "cancel"
  | "sendToDirector" | "prioritizeApprove" | "returnFromDirector";

type ActionConfig = {
  label:   string;
  icon:    React.ElementType;
  variant: "default" | "outline" | "destructive" | "secondary";
  cls?:    string;
};

const ACTION_CONFIG: Record<ActionType, ActionConfig> = {
  open:        { label: "Abrir demanda",              icon: FolderOpen,   variant: "default"     },
  analysis:    { label: "Enviar para análise",         icon: FlaskConical, variant: "default"     },
  approve:     { label: "Aprovar",                    icon: CheckCircle2, variant: "default", cls: "bg-emerald-600 hover:bg-emerald-700 text-white" },
  start:       { label: "Iniciar desenvolvimento",    icon: Code2,        variant: "default", cls: "bg-purple-600 hover:bg-purple-700 text-white"  },
  homologation:{ label: "Enviar para homologação",    icon: Send,         variant: "default", cls: "bg-orange-500 hover:bg-orange-600 text-white"  },
  homologate:  { label: "Homologar em produção",      icon: ShieldCheck,  variant: "default", cls: "bg-green-600 hover:bg-green-700 text-white"    },
  reject:      { label: "Reprovar",                  icon: XCircle,      variant: "destructive" },
  return:      { label: "Retornar para desenvolvimento", icon: RotateCcw,variant: "outline"      },
  cancel:             { label: "Cancelar demanda",                   icon: Ban,       variant: "outline", cls: "text-destructive border-destructive/40 hover:bg-destructive/5" },
  sendToDirector:     { label: "Enviar para priori. diretoria",      icon: Star,      variant: "default", cls: "bg-indigo-600 hover:bg-indigo-700 text-white" },
  prioritizeApprove:  { label: "Priorizar e aprovar",                icon: CheckCircle2, variant: "default", cls: "bg-indigo-600 hover:bg-indigo-700 text-white" },
  returnFromDirector: { label: "Devolver para análise",              icon: Undo2,     variant: "outline" },
};

// ── Progressão visual de status ───────────────────────────────────

const WORKFLOW_STEPS: DemandStatus[] = [
  "RASCUNHO",
  "ABERTA",
  "EM_ANALISE",
  "PRIORIZACAO_DIRETORIA",
  "APROVADA",
  "EM_DESENVOLVIMENTO",
  "AGUARDANDO_HOMOLOGACAO",
  "HOMOLOGADA_PRODUCAO",
];

const TERMINAL_STATUSES = new Set<DemandStatus>(["CANCELADA", "REPROVADA", "CONCLUIDA"]);

function WorkflowProgress({ current }: { current: DemandStatus }) {
  if (TERMINAL_STATUSES.has(current)) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-4 py-3">
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
            STATUS_CONFIG[current]?.style,
          )}
        >
          {STATUS_CONFIG[current]?.label ?? current}
        </span>
        <span className="text-xs text-muted-foreground">
          {current === "CANCELADA" ? "Demanda encerrada por cancelamento" : ""}
          {current === "REPROVADA" ? "Aguardando retorno para desenvolvimento" : ""}
          {current === "CONCLUIDA" ? "Demanda concluída" : ""}
        </span>
      </div>
    );
  }

  const currentIdx = WORKFLOW_STEPS.indexOf(current);

  return (
    <div className="w-full overflow-x-auto pb-1">
      <ol className="flex items-start gap-0 min-w-max">
        {WORKFLOW_STEPS.map((step, idx) => {
          const done    = idx < currentIdx;
          const active  = idx === currentIdx;
          const pending = idx > currentIdx;

          const cfg = STATUS_CONFIG[step];

          return (
            <li key={step} className="flex items-center">
              {/* Nó */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
                    done    && "border-brand-primary bg-brand-primary text-white",
                    active  && "border-brand-primary bg-white text-brand-primary ring-2 ring-brand-primary/30",
                    pending && "border-border bg-background text-muted-foreground",
                  )}
                >
                  {done ? "✓" : idx + 1}
                </div>
                <span
                  className={cn(
                    "mt-1 text-[10px] text-center max-w-[64px] leading-tight",
                    active  && "font-semibold text-brand-text-dark",
                    done    && "text-brand-text-body",
                    pending && "text-muted-foreground",
                  )}
                >
                  {cfg?.label ?? step.replace(/_/g, " ")}
                </span>
              </div>

              {/* Conector */}
              {idx < WORKFLOW_STEPS.length - 1 && (
                <div
                  className={cn(
                    "mx-1 h-0.5 w-8 self-start mt-3.5",
                    idx < currentIdx ? "bg-brand-primary" : "bg-border",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────

type Props = {
  demand: DemandWithRelations;
  actor:  UserForPermission;
};

export function WorkflowSection({ demand, actor }: Props) {
  const demandPerm = {
    id:        demand.id,
    creatorId: demand.creatorId,
    assigneeId:demand.assigneeId,
    status:    demand.status,
  };

  const evidenceCount = demand.evidences.length;

  // Resolve quais ações estão disponíveis para o actor
  const canOpen               = demand.status === "RASCUNHO"               && canChangeDemandStatus(actor, demandPerm, "ABERTA");
  const canAnalysis           = demand.status === "ABERTA"                 && canChangeDemandStatus(actor, demandPerm, "EM_ANALISE");
  const canSendToDirector     = demand.status === "EM_ANALISE"             && canChangeDemandStatus(actor, demandPerm, "PRIORIZACAO_DIRETORIA");
  const canPrioritizeApprove  = demand.status === "PRIORIZACAO_DIRETORIA"  && canPrioritizeDemand(actor);
  const canReturnFromDirector = demand.status === "PRIORIZACAO_DIRETORIA"  && canPrioritizeDemand(actor);
  const canStart              = demand.status === "APROVADA"               && canChangeDemandStatus(actor, demandPerm, "EM_DESENVOLVIMENTO");
  const canHomologation       = demand.status === "EM_DESENVOLVIMENTO"     && canChangeDemandStatus(actor, demandPerm, "AGUARDANDO_HOMOLOGACAO");
  const canHomologate         = demand.status === "AGUARDANDO_HOMOLOGACAO" && canHomologateDemand(actor, demandPerm);
  const canReject             = demand.status === "AGUARDANDO_HOMOLOGACAO" && canChangeDemandStatus(actor, demandPerm, "REPROVADA");
  const canReturn             = (demand.status === "REPROVADA" || demand.status === "AGUARDANDO_HOMOLOGACAO")
                                && canChangeDemandStatus(actor, demandPerm, "EM_DESENVOLVIMENTO");
  const canCancel             = ["RASCUNHO","ABERTA","EM_ANALISE","PRIORIZACAO_DIRETORIA","APROVADA","EM_DESENVOLVIMENTO"].includes(demand.status)
                                && canChangeDemandStatus(actor, demandPerm, "CANCELADA");

  const hasAnyAction = canOpen || canAnalysis || canSendToDirector || canPrioritizeApprove ||
                       canReturnFromDirector || canStart ||
                       canHomologation || canHomologate || canReject || canReturn || canCancel;

  function TriggerBtn({ type, onClick }: { type: ActionType; onClick?: React.MouseEventHandler<HTMLButtonElement> }) {
    const cfg  = ACTION_CONFIG[type];
    const Icon = cfg.icon;
    return (
      <Button
        variant={cfg.variant}
        size="sm"
        className={cn("gap-1.5", cfg.cls)}
        onClick={onClick}
      >
        <Icon className="h-4 w-4" />
        {cfg.label}
      </Button>
    );
  }

  return (
    <Card className="card-accent-top">
      <CardHeader className="card-header-gradient pb-3">
        <CardTitle className="text-sm text-brand-text-dark">Workflow da demanda</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">

        {/* Progresso visual */}
        <WorkflowProgress current={demand.status} />

        {/* Informações contextuais */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          {demand.approvedBy && (
            <div className="rounded-md bg-emerald-50 border border-emerald-100 px-3 py-2">
              <p className="text-muted-foreground">Aprovado por</p>
              <p className="font-medium text-emerald-700">{demand.approvedBy.name}</p>
            </div>
          )}
          {demand.homologatedBy && (
            <div className="rounded-md bg-green-50 border border-green-100 px-3 py-2">
              <p className="text-muted-foreground">Homologado por</p>
              <p className="font-medium text-green-700">{demand.homologatedBy.name}</p>
            </div>
          )}
          {demand.canceledBy && (
            <div className="rounded-md bg-slate-50 border border-slate-200 px-3 py-2">
              <p className="text-muted-foreground">Cancelado por</p>
              <p className="font-medium text-slate-600">{demand.canceledBy.name}</p>
            </div>
          )}
        </div>

        {/* Razões registradas */}
        {demand.rejectionReason && (
          <div className="rounded-md bg-red-50 border border-red-100 px-3 py-2 text-xs">
            <p className="font-medium text-red-700 mb-0.5">Motivo da reprovação</p>
            <p className="text-red-600">{demand.rejectionReason}</p>
          </div>
        )}
        {demand.cancellationReason && (
          <div className="rounded-md bg-slate-50 border border-slate-200 px-3 py-2 text-xs">
            <p className="font-medium text-slate-600 mb-0.5">Motivo do cancelamento</p>
            <p className="text-slate-500">{demand.cancellationReason}</p>
          </div>
        )}
        {demand.deliveryNotes && (
          <div className="rounded-md bg-orange-50 border border-orange-100 px-3 py-2 text-xs">
            <p className="font-medium text-orange-700 mb-0.5">Observações de entrega</p>
            <p className="text-orange-600">{demand.deliveryNotes}</p>
          </div>
        )}
        {demand.homologationNotes && (
          <div className="rounded-md bg-green-50 border border-green-100 px-3 py-2 text-xs">
            <p className="font-medium text-green-700 mb-0.5">Observações de homologação</p>
            <p className="text-green-600">{demand.homologationNotes}</p>
          </div>
        )}

        {/* Botões de ação */}
        {hasAnyAction ? (
          <div className="border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              Ações disponíveis
            </p>
            <div className="flex flex-wrap gap-2">
              {canOpen && (
                <ConfirmTransitionDialog
                  demandId={demand.id} action="open"
                  title="Abrir demanda"
                  description="A demanda será publicada e ficará visível para análise. Certifique-se de que todos os campos obrigatórios estão preenchidos."
                  confirmLabel="Abrir demanda"
                  trigger={<TriggerBtn type="open" />}
                />
              )}
              {canAnalysis && (
                <ConfirmTransitionDialog
                  demandId={demand.id} action="analysis"
                  title="Enviar para análise"
                  description="A demanda será movida para análise técnica."
                  confirmLabel="Enviar para análise"
                  trigger={<TriggerBtn type="analysis" />}
                />
              )}
              {canSendToDirector && (
                <ConfirmTransitionDialog
                  demandId={demand.id} action="sendToDirector"
                  title="Enviar para priorização da diretoria"
                  description="A demanda será encaminhada para a diretoria definir a ordem de prioridade e aprovação."
                  confirmLabel="Enviar para diretoria"
                  trigger={<TriggerBtn type="sendToDirector" />}
                />
              )}
              {canPrioritizeApprove && (
                <PrioritizeAndApproveDialog
                  demandId={demand.id}
                  trigger={<TriggerBtn type="prioritizeApprove" />}
                />
              )}
              {canReturnFromDirector && (
                <ReturnFromDirectorDialog
                  demandId={demand.id}
                  trigger={<TriggerBtn type="returnFromDirector" />}
                />
              )}
              {canStart && (
                <StartDevelopmentDialog
                  demandId={demand.id}
                  allowPastDates={actor.role === "GESTOR" || actor.role === "ADMIN"}
                  trigger={<TriggerBtn type="start" />}
                />
              )}
              {canHomologation && (
                <SendToHomologationDialog
                  demandId={demand.id}
                  evidenceCount={evidenceCount}
                  trigger={<TriggerBtn type="homologation" />}
                />
              )}
              {canHomologate && (
                <HomologateDialog
                  demandId={demand.id}
                  trigger={<TriggerBtn type="homologate" />}
                />
              )}
              {canReject && (
                <RejectDemandDialog
                  demandId={demand.id}
                  trigger={<TriggerBtn type="reject" />}
                />
              )}
              {canReturn && (
                <ConfirmTransitionDialog
                  demandId={demand.id} action="return"
                  title="Retornar para desenvolvimento"
                  description="A demanda voltará para o desenvolvedor responsável."
                  confirmLabel="Retornar"
                  trigger={<TriggerBtn type="return" />}
                />
              )}
              {canCancel && (
                <CancelDemandDialog
                  demandId={demand.id}
                  trigger={<TriggerBtn type="cancel" />}
                />
              )}
            </div>
          </div>
        ) : (
          !TERMINAL_STATUSES.has(demand.status) && demand.status !== "HOMOLOGADA_PRODUCAO" && (
            <p className="text-xs text-muted-foreground pt-2 border-t">
              Nenhuma ação disponível para o seu perfil neste status.
            </p>
          )
        )}
      </CardContent>
    </Card>
  );
}
