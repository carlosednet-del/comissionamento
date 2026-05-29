"use client";

import Link from "next/link";
const DATE_FMT = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
const BRL      = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

import { useState, useTransition } from "react";
import { useRouter }               from "next/navigation";
import type { DemandWithRelations, AuditLog } from "@/types";
import type { UserForPermission }             from "@/server/auth/permissions";
import { canEditDemand, canAttachEvidence, canDeleteDemand } from "@/server/auth/permissions";
import { deleteDemandAction }      from "@/server/actions/demandActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button }    from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatusBadge }      from "./status-badge";
import { PriorityBadge }    from "./priority-badge";
import { TypeBadge }        from "./type-badge";
import { AttachEvidenceDialog } from "./attach-evidence-dialog";
import { AuditTimeline }    from "./audit-timeline";
import { WorkflowSection }  from "./workflow-section";
import {
  Pencil, ExternalLink, Clock, Calendar, User,
  Building2, Layers, Trash2,
} from "lucide-react";
import { COMPLEXITY_LABELS, ROI_LABELS, WORKER_PROFILE_LABELS } from "@/lib/demand-pricing";
import type { ComplexityLevel, RoiLevel, WorkerProfile } from "@prisma/client";

type AuditLogEntry = AuditLog & { user: { id: string; name: string } };

type Props = {
  demand:    DemandWithRelations;
  actor:     UserForPermission;
  auditLogs: AuditLogEntry[];
};

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return "—";
  return DATE_FMT.format(date);
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

function OptionalText({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-muted-foreground italic">—</span>;
  return <span className="whitespace-pre-wrap">{value}</span>;
}

export function DemandDetail({ demand, actor, auditLogs }: Props) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition]  = useTransition();

  const demandPerm = {
    id:         demand.id,
    creatorId:  demand.creatorId,
    assigneeId: demand.assigneeId,
    status:     demand.status,
  };

  const canEdit   = canEditDemand(actor, demandPerm);
  const canAttach = canAttachEvidence(actor, demandPerm);
  const canDelete = canDeleteDemand(actor);

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteDemandAction(demand.id);
      if (result.success) {
        router.push("/demandas");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* ── Cabeçalho ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <StatusBadge status={demand.status} />
            <PriorityBadge priority={demand.priority} showIcon />
            <TypeBadge type={demand.demandType} />
          </div>
          <h1 className="text-2xl font-bold text-brand-text-dark leading-snug">{demand.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Criado por {demand.creator.name} em {fmtDate(demand.createdAt)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          {canEdit && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/demandas/${demand.id}/editar`}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Link>
            </Button>
          )}
          {canAttach && <AttachEvidenceDialog demandId={demand.id} />}
          {canDelete && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/40 hover:bg-destructive/5"
              onClick={() => setConfirmOpen(true)}
              disabled={isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </Button>
          )}
        </div>
      </div>

      <Separator />

      {/* ── Workflow da demanda ───────────────────────────────────── */}
      <WorkflowSection demand={demand} actor={actor} />

      {/* ── Grade de informações ─────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-6">

          {/* Identificação */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4 text-brand-primary" />
                Identificação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InfoRow label="Área solicitante">{demand.requesterArea}</InfoRow>
                <InfoRow label="Solicitante">{demand.requesterName}</InfoRow>
                {demand.requesterEmail && (
                  <InfoRow label="E-mail">{demand.requesterEmail}</InfoRow>
                )}
              </dl>
              {demand.description && (
                <>
                  <Separator className="my-3" />
                  <div className="text-sm whitespace-pre-wrap">{demand.description}</div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Execução técnica */}
          {(demand.assignee || demand.estimatedHours || demand.complexity || demand.roi) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-brand-primary" />
                  Execução técnica
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <InfoRow label="Responsável">
                    {demand.assignee?.name ?? <span className="italic text-muted-foreground">—</span>}
                  </InfoRow>
                  {demand.assigneeProfileSnapshot && (
                    <InfoRow label="Perfil">
                      {WORKER_PROFILE_LABELS[demand.assigneeProfileSnapshot as WorkerProfile] ?? demand.assigneeProfileSnapshot}
                    </InfoRow>
                  )}
                  {demand.estimatedHours != null && (
                    <InfoRow label="Horas estimadas">{demand.estimatedHours}h</InfoRow>
                  )}
                  {demand.complexity && (
                    <InfoRow label="Complexidade">
                      {COMPLEXITY_LABELS[demand.complexity as ComplexityLevel] ?? demand.complexity}
                    </InfoRow>
                  )}
                  {demand.roi && (
                    <InfoRow label="ROI">
                      {ROI_LABELS[demand.roi as RoiLevel] ?? demand.roi}
                    </InfoRow>
                  )}
                  {demand.estimatedDemandValue != null && (
                    <InfoRow label="Valor estimado">
                      <span className="font-mono font-semibold text-brand-text-dark">
                        {BRL.format(demand.estimatedDemandValue)}
                      </span>
                    </InfoRow>
                  )}
                </dl>
              </CardContent>
            </Card>
          )}

          {/* Contexto de negócio */}
          {(demand.businessProblem || demand.expectedResult || demand.impactDescription ||
            demand.dependencies || demand.risks || demand.observations) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers className="h-4 w-4 text-brand-primary" />
                  Contexto de negócio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-4">
                  {demand.businessProblem && (
                    <InfoRow label="Critérios de aceite / Problema de negócio">
                      <OptionalText value={demand.businessProblem} />
                    </InfoRow>
                  )}
                  {demand.expectedResult && (
                    <InfoRow label="Resultado esperado"><OptionalText value={demand.expectedResult} /></InfoRow>
                  )}
                  {demand.impactDescription && (
                    <InfoRow label="Impacto"><OptionalText value={demand.impactDescription} /></InfoRow>
                  )}
                  {demand.dependencies && (
                    <InfoRow label="Dependências"><OptionalText value={demand.dependencies} /></InfoRow>
                  )}
                  {demand.risks && (
                    <InfoRow label="Riscos"><OptionalText value={demand.risks} /></InfoRow>
                  )}
                  {demand.observations && (
                    <InfoRow label="Observações"><OptionalText value={demand.observations} /></InfoRow>
                  )}
                </dl>
              </CardContent>
            </Card>
          )}

          {/* Evidências */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-brand-primary" />
                Evidências ({demand.evidences.length})
              </CardTitle>
              {canAttach && <AttachEvidenceDialog demandId={demand.id} />}
            </CardHeader>
            <CardContent>
              {demand.evidences.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma evidência anexada.</p>
              ) : (
                <ul className="space-y-2">
                  {demand.evidences.map((ev) => (
                    <li key={ev.id} className="flex items-start gap-3 rounded-md border p-3">
                      <ExternalLink className="h-4 w-4 mt-0.5 text-brand-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <a
                          href={ev.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-brand-primary hover:underline"
                        >
                          {ev.title}
                        </a>
                        {ev.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{ev.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          por {ev.createdBy?.name ?? "sistema"} — {fmtDate(ev.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coluna lateral */}
        <div className="space-y-4">

          {/* Pessoas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4 text-brand-primary" />
                Pessoas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <InfoRow label="Responsável">
                  {demand.assignee?.name ?? <span className="text-muted-foreground italic">Não atribuído</span>}
                </InfoRow>
                <InfoRow label="Criador">{demand.creator.name}</InfoRow>
                {demand.approvedBy && (
                  <InfoRow label="Aprovado por">{demand.approvedBy.name}</InfoRow>
                )}
                {demand.homologatedBy && (
                  <InfoRow label="Homologado por">{demand.homologatedBy.name}</InfoRow>
                )}
                {demand.canceledBy && (
                  <InfoRow label="Cancelado por">{demand.canceledBy.name}</InfoRow>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Datas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4 text-brand-primary" />
                Datas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <InfoRow label="Criado em">{fmtDate(demand.createdAt)}</InfoRow>
                <InfoRow label="Início previsto">{fmtDate(demand.plannedStartDate)}</InfoRow>
                <InfoRow label="Entrega prevista">{fmtDate(demand.plannedDeliveryDate)}</InfoRow>
                {demand.actualStartDate && (
                  <InfoRow label="Início real">{fmtDate(demand.actualStartDate)}</InfoRow>
                )}
                {demand.actualDeliveryDate && (
                  <InfoRow label="Entrega real">{fmtDate(demand.actualDeliveryDate)}</InfoRow>
                )}
                {demand.approvedAt && (
                  <InfoRow label="Aprovado em">{fmtDate(demand.approvedAt)}</InfoRow>
                )}
                {demand.homologationDate && (
                  <InfoRow label="Homologado em">{fmtDate(demand.homologationDate)}</InfoRow>
                )}
                {demand.canceledAt && (
                  <InfoRow label="Cancelado em">{fmtDate(demand.canceledAt)}</InfoRow>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Histórico de atividades ──────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Histórico de atividades</CardTitle>
        </CardHeader>
        <CardContent>
          <AuditTimeline logs={auditLogs} />
        </CardContent>
      </Card>

      {/* ── Diálogo de confirmação de exclusão ───────────────────── */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir demanda?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é <strong>irreversível</strong>. A demanda{" "}
              <strong>&ldquo;{demand.title}&rdquo;</strong> e todo o seu
              histórico de atividades serão permanentemente removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isPending ? "Excluindo…" : "Sim, excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
