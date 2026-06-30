import { cn } from "@/lib/utils";
import type { StatementStatus } from "@prisma/client";

const STATUS_MAP: Record<StatementStatus, { label: string; className: string }> = {
  PENDING:  { label: "Pendente",  className: "bg-amber-100 text-amber-800 border-amber-300" },
  SIGNED:   { label: "Assinado",  className: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  EXPORTED: { label: "Exportado", className: "bg-blue-100 text-blue-800 border-blue-300" },
  CANCELED: { label: "Cancelado", className: "bg-red-100 text-red-800 border-red-300" },
};

export function StatementStatusBadge({ status }: { status: StatementStatus | null }) {
  if (!status) return null;
  const { label, className } = STATUS_MAP[status] ?? STATUS_MAP.PENDING;
  return (
    <span className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
      className,
    )}>
      {label}
    </span>
  );
}
