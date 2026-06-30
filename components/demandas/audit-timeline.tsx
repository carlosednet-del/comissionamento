import type { AuditAction } from "@prisma/client";
const DATETIME_FMT = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit", month: "2-digit", year: "numeric",
  hour: "2-digit", minute: "2-digit",
});
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Plus,
  Pencil,
  ShieldCheck,
  PlayCircle,
  Send,
  Ban,
  Paperclip,
  MoreHorizontal,
  FileText,
  Download,
  KeyRound,
} from "lucide-react";

type AuditLogWithUser = {
  id:        string;
  action:    AuditAction;
  oldValue:  unknown;
  newValue:  unknown;
  createdAt: Date | string;
  user:      { id: string; name: string };
};

type Props = { logs: AuditLogWithUser[] };

const ACTION_CONFIG: Record<
  AuditAction,
  { label: string; icon: React.ElementType; color: string; bg: string }
> = {
  CREATE:                { label: "Demanda criada",               icon: Plus,         color: "text-emerald-600",  bg: "bg-emerald-100"  },
  UPDATE:                { label: "Demanda atualizada",           icon: Pencil,       color: "text-blue-600",     bg: "bg-blue-100"     },
  DELETE:                { label: "Demanda excluída",             icon: XCircle,      color: "text-red-600",      bg: "bg-red-100"      },
  STATUS_CHANGE:         { label: "Status alterado",             icon: RefreshCw,    color: "text-amber-600",    bg: "bg-amber-100"    },
  APPROVAL:              { label: "Demanda aprovada",            icon: CheckCircle2, color: "text-emerald-600",  bg: "bg-emerald-100"  },
  REJECTION:             { label: "Demanda reprovada",           icon: XCircle,      color: "text-red-600",      bg: "bg-red-100"      },
  HOMOLOGATION:          { label: "Demanda homologada",          icon: ShieldCheck,  color: "text-green-600",    bg: "bg-green-100"    },
  DEVELOPMENT_STARTED:   { label: "Desenvolvimento iniciado",    icon: PlayCircle,   color: "text-purple-600",   bg: "bg-purple-100"   },
  SENT_TO_HOMOLOGATION:  { label: "Enviada para homologação",    icon: Send,         color: "text-orange-600",   bg: "bg-orange-100"   },
  DEMAND_CANCELED:                            { label: "Demanda cancelada",                      icon: Ban,          color: "text-slate-600",   bg: "bg-slate-100"   },
  EVIDENCE_ADDED:                             { label: "Evidência adicionada",                   icon: Paperclip,    color: "text-blue-600",    bg: "bg-blue-100"    },
  SENT_TO_DIRECTOR_PRIORITIZATION:            { label: "Enviada para priorização da diretoria",  icon: Send,         color: "text-indigo-600",  bg: "bg-indigo-100"  },
  DIRECTOR_PRIORITY_SET:                      { label: "Prioridade da diretoria definida",       icon: MoreHorizontal, color: "text-indigo-600", bg: "bg-indigo-100" },
  DEMAND_PRIORITIZED_AND_APPROVED:            { label: "Priorizada e aprovada pela diretoria",   icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-100" },
  DEMAND_RETURNED_FROM_DIRECTOR_PRIORITIZATION: { label: "Devolvida para análise",               icon: RefreshCw,    color: "text-amber-600",   bg: "bg-amber-100"   },
  STATEMENT_SIGNED:                             { label: "Extrato assinado",                      icon: FileText,     color: "text-emerald-600", bg: "bg-emerald-100" },
  STATEMENT_EXPORTED:                           { label: "Extrato exportado",                     icon: Download,     color: "text-blue-600",    bg: "bg-blue-100"    },
  DAP_CLOSING_PREVIEWED:                        { label: "Fechamento DAP consultado",             icon: FileText,     color: "text-slate-500",   bg: "bg-slate-100"   },
  DAP_PERIOD_EXPORTED:                          { label: "Variáveis DAP exportadas",              icon: Download,     color: "text-indigo-600",  bg: "bg-indigo-100"  },
  DAP_DEVELOPER_STATEMENT_EXPORTED:             { label: "Extrato do DEV exportado pelo DAP",    icon: Download,     color: "text-indigo-600",  bg: "bg-indigo-100"  },
  PASSWORD_CHANGED:                             { label: "Senha alterada",                        icon: KeyRound,     color: "text-emerald-600", bg: "bg-emerald-100" },
  PASSWORD_RESET_FORCED:                        { label: "Reset de senha solicitado",             icon: KeyRound,     color: "text-amber-600",   bg: "bg-amber-100"   },
};

const STATUS_LABELS: Record<string, string> = {
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

function getValue(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object") return null;
  return v as Record<string, unknown>;
}

function fmtValue(key: string, value: unknown): string {
  if (key === "status" || key === "oldStatus" || key === "newStatus") {
    return STATUS_LABELS[String(value)] ?? String(value);
  }
  if (value instanceof Date) return DATETIME_FMT.format(value);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return DATETIME_FMT.format(new Date(value));
  }
  return String(value);
}

const SKIP_KEYS = new Set(["approvedById", "homologatedById", "canceledById", "startedById"]);
const HUMAN_KEYS: Record<string, string> = {
  status:             "Status",
  rejectionReason:    "Motivo da reprovação",
  cancellationReason: "Motivo do cancelamento",
  deliveryNotes:      "Observações de entrega",
  homologationNotes:  "Observações de homologação",
  actualDeliveryDate: "Data real de entrega",
};

function renderDetails(old: Record<string, unknown> | null, nw: Record<string, unknown> | null) {
  if (!nw) return null;
  const entries = Object.entries(nw).filter(([k]) => !SKIP_KEYS.has(k));
  if (entries.length === 0) return null;

  return (
    <dl className="mt-1.5 space-y-0.5">
      {entries.map(([key, value]) => {
        const oldVal = old?.[key];
        const changed = oldVal !== undefined && oldVal !== value;
        const label = HUMAN_KEYS[key] ?? key.replace(/([A-Z])/g, " $1").toLowerCase();

        if (key === "status" && changed) {
          return (
            <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="line-through text-red-400">{fmtValue(key, oldVal)}</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-emerald-600 font-medium">{fmtValue(key, value)}</span>
            </div>
          );
        }

        return (
          <div key={key} className="text-xs text-muted-foreground">
            <span className="font-medium capitalize">{label}:</span>{" "}
            {changed && <span className="line-through text-red-400 mr-1">{fmtValue(key, oldVal)}</span>}
            <span className={changed ? "text-emerald-600 font-medium" : ""}>{fmtValue(key, value)}</span>
          </div>
        );
      })}
    </dl>
  );
}

export function AuditTimeline({ logs }: Props) {
  if (logs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Nenhuma atividade registrada.
      </p>
    );
  }

  return (
    <ol className="relative border-l border-muted ml-3 space-y-5">
      {logs.map((log) => {
        const cfg = ACTION_CONFIG[log.action] ?? {
          label: log.action,
          icon:  MoreHorizontal,
          color: "text-slate-500",
          bg:    "bg-slate-100",
        };
        const Icon = cfg.icon;

        const nw  = getValue(log.newValue);
        const old = getValue(log.oldValue);

        const reason = (nw?.rejectionReason ?? nw?.cancellationReason) as string | undefined;

        return (
          <li key={log.id} className="ml-5">
            <span
              className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ${cfg.bg}`}
            >
              <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
            </span>

            <div className="rounded-lg border bg-card px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">{cfg.label}</p>
                <time className="text-xs text-muted-foreground whitespace-nowrap">
                  {DATETIME_FMT.format(new Date(log.createdAt))}
                </time>
              </div>

              <p className="text-xs text-muted-foreground mt-0.5">
                por <span className="font-medium text-foreground">{log.user.name}</span>
              </p>

              {renderDetails(old, nw)}

              {reason && (
                <blockquote className="mt-1.5 border-l-2 border-muted pl-2 text-xs italic text-muted-foreground">
                  {reason}
                </blockquote>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
