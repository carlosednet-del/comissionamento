import type { AuditLog, AuditAction } from "@prisma/client";
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
  MoreHorizontal,
} from "lucide-react";

type AuditLogWithUser = AuditLog & {
  user: { id: string; name: string };
};

type Props = {
  logs: AuditLogWithUser[];
};

const ACTION_CONFIG: Record<
  AuditAction,
  { label: string; icon: React.ElementType; color: string; bg: string }
> = {
  CREATE:        { label: "Demanda criada",       icon: Plus,         color: "text-emerald-600",  bg: "bg-emerald-100" },
  UPDATE:        { label: "Demanda atualizada",    icon: Pencil,       color: "text-blue-600",     bg: "bg-blue-100"    },
  DELETE:        { label: "Demanda excluída",      icon: XCircle,      color: "text-red-600",      bg: "bg-red-100"     },
  STATUS_CHANGE: { label: "Status alterado",       icon: RefreshCw,    color: "text-amber-600",    bg: "bg-amber-100"   },
  APPROVAL:      { label: "Demanda aprovada",      icon: CheckCircle2, color: "text-emerald-600",  bg: "bg-emerald-100" },
  REJECTION:     { label: "Demanda reprovada",     icon: XCircle,      color: "text-red-600",      bg: "bg-red-100"     },
  HOMOLOGATION:  { label: "Demanda homologada",    icon: ShieldCheck,  color: "text-green-600",    bg: "bg-green-100"   },
};

function getValue(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object") return null;
  return v as Record<string, unknown>;
}

function renderDiff(old: Record<string, unknown> | null, nw: Record<string, unknown> | null) {
  if (!nw) return null;
  const entries = Object.entries(nw).filter(([k]) => k !== "reason");
  if (entries.length === 0) return null;

  return (
    <dl className="mt-1 space-y-0.5">
      {entries.map(([key, value]) => {
        const oldVal = old?.[key];
        const changed = oldVal !== undefined && oldVal !== value;
        return (
          <div key={key} className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
            <dt className="font-medium capitalize">{key.replace(/([A-Z])/g, " $1").toLowerCase()}:</dt>
            {changed && (
              <dd className="line-through text-red-400">{String(oldVal)}</dd>
            )}
            <dd className={changed ? "text-emerald-600 font-medium" : ""}>{String(value)}</dd>
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
          icon: MoreHorizontal,
          color: "text-slate-500",
          bg: "bg-slate-100",
        };
        const Icon = cfg.icon;

        const nw  = getValue(log.newValue);
        const old = getValue(log.oldValue);

        const reason = nw?.reason as string | undefined;

        return (
          <li key={log.id} className="ml-5">
            {/* Ícone no ponto da linha */}
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

              {renderDiff(old, nw)}

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
