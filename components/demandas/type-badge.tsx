import type { DemandType } from "@prisma/client";
import { cn } from "@/lib/utils";

type Props = { type: DemandType; className?: string };

const TYPE_CONFIG: Record<DemandType, { label: string; style: string }> = {
  NOVA_SOLUCAO:      { label: "Nova solução",      style: "bg-violet-50 text-violet-700 border-violet-200" },
  EVOLUCAO_PRODUCAO: { label: "Evolução",           style: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  CORRECAO:          { label: "Correção",           style: "bg-rose-50 text-rose-700 border-rose-200" },
  AUTOMACAO:         { label: "Automação",          style: "bg-teal-50 text-teal-700 border-teal-200" },
  DASHBOARD:         { label: "Dashboard",          style: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  INTEGRACAO:        { label: "Integração",         style: "bg-blue-50 text-blue-700 border-blue-200" },
  OUTRO:             { label: "Outro",              style: "bg-slate-50 text-slate-600 border-slate-200" },
};

export function TypeBadge({ type, className }: Props) {
  const { label, style } = TYPE_CONFIG[type] ?? {
    label: type,
    style: "bg-slate-50 text-slate-600 border-slate-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        style,
        className,
      )}
    >
      {label}
    </span>
  );
}

export { TYPE_CONFIG };
