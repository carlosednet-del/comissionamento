import type { DemandPriority } from "@prisma/client";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowDown, ArrowUp, Flame } from "lucide-react";

type Props = { priority: DemandPriority; className?: string; showIcon?: boolean };

const PRIORITY_CONFIG: Record<
  DemandPriority,
  { label: string; style: string; icon: React.ElementType }
> = {
  BAIXA:   { label: "Baixa",    style: "bg-slate-50 text-slate-600 border-slate-200",    icon: ArrowDown },
  MEDIA:   { label: "Média",    style: "bg-blue-50 text-blue-700 border-blue-200",       icon: ArrowUp },
  ALTA:    { label: "Alta",     style: "bg-amber-50 text-amber-700 border-amber-200",    icon: AlertTriangle },
  CRITICA: { label: "Crítica",  style: "bg-red-50 text-red-700 border-red-200",          icon: Flame },
};

export function PriorityBadge({ priority, className, showIcon = false }: Props) {
  const { label, style, icon: Icon } = PRIORITY_CONFIG[priority] ?? {
    label: priority,
    style: "bg-slate-50 text-slate-600 border-slate-200",
    icon: ArrowUp,
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        style,
        className,
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {label}
    </span>
  );
}

export { PRIORITY_CONFIG };
