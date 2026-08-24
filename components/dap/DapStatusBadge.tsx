import { cn } from "@/lib/utils";
import type { StatementStatus } from "@prisma/client";

type EffectiveStatus = StatementStatus | "PENDING" | null;

const MAP: Record<string, { label: string; className: string }> = {
  SIGNED:   { label: "Assinado",  className: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  EXPORTED: { label: "Exportado", className: "bg-blue-100    text-blue-800    border-blue-300"    },
  PENDING:  { label: "Pendente",  className: "bg-amber-100   text-amber-800   border-amber-300"   },
  CANCELED: { label: "Desligado",  className: "bg-slate-100   text-slate-600   border-slate-300"  },
};

export function DapStatusBadge({ status }: { status: EffectiveStatus }) {
  const key = status ?? "PENDING";
  const { label, className } = MAP[key] ?? MAP.PENDING;
  return (
    <span className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide whitespace-nowrap",
      className,
    )}>
      {label}
    </span>
  );
}
