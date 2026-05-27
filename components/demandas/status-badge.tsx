import type { DemandStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

type Props = { status: DemandStatus; className?: string };

const STATUS_CONFIG: Record<DemandStatus, { label: string; style: string }> = {
  RASCUNHO:               { label: "Rascunho",               style: "bg-slate-100 text-slate-600 border-slate-200" },
  ABERTA:                 { label: "Aberta",                 style: "bg-blue-50 text-blue-700 border-blue-200" },
  EM_ANALISE:             { label: "Em análise",             style: "bg-amber-50 text-amber-700 border-amber-200" },
  APROVADA:               { label: "Aprovada",               style: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  EM_DESENVOLVIMENTO:     { label: "Em desenvolvimento",     style: "bg-brand-bg-light text-brand-primary border-brand-bg-mid" },
  AGUARDANDO_HOMOLOGACAO: { label: "Aguard. homologação",    style: "bg-orange-50 text-orange-700 border-orange-200" },
  HOMOLOGADA_PRODUCAO:    { label: "Homologada",             style: "bg-green-50 text-green-700 border-green-200" },
  REPROVADA:              { label: "Reprovada",              style: "bg-red-50 text-red-700 border-red-200" },
  CANCELADA:              { label: "Cancelada",              style: "bg-slate-50 text-slate-500 border-slate-200" },
  CONCLUIDA:              { label: "Concluída",              style: "bg-emerald-100 text-emerald-800 border-emerald-200" },
};

export function StatusBadge({ status, className }: Props) {
  const { label, style } = STATUS_CONFIG[status] ?? { label: status, style: "bg-slate-100 text-slate-600" };
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

export { STATUS_CONFIG };
