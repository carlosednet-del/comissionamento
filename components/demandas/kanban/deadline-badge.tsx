import { cn } from "@/lib/utils";
import type { DeadlineStatus } from "@/services/demandKanbanService";
import { getDeadlineStatus } from "@/services/demandKanbanService";
import { CalendarClock, AlertCircle } from "lucide-react";

const DATE_FMT = new Intl.DateTimeFormat("pt-BR", {
  day:   "2-digit",
  month: "2-digit",
  year:  "numeric",
});

const DEADLINE_CONFIG: Record<
  DeadlineStatus,
  { label?: string; style: string; icon?: React.ElementType }
> = {
  overdue: {
    style: "bg-red-50 text-red-700 border-red-200",
    icon:  AlertCircle,
  },
  today: {
    style: "bg-amber-50 text-amber-700 border-amber-200",
    icon:  CalendarClock,
  },
  soon: {
    style: "bg-yellow-50 text-yellow-700 border-yellow-200",
    icon:  CalendarClock,
  },
  ok: {
    style: "bg-slate-50 text-slate-600 border-slate-200",
  },
  none: {
    style: "bg-slate-50 text-slate-400 border-slate-100",
    label: "Sem prazo",
  },
};

type Props = {
  date: Date | string | null | undefined;
  className?: string;
};

export function DeadlineBadge({ date, className }: Props) {
  const status = getDeadlineStatus(date ? new Date(date) : null);
  const cfg    = DEADLINE_CONFIG[status];
  const Icon   = cfg.icon;

  const label = (() => {
    if (cfg.label) return cfg.label;
    if (!date) return "Sem prazo";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "—";
    return DATE_FMT.format(d);
  })();

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap",
        cfg.style,
        className,
      )}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </span>
  );
}
