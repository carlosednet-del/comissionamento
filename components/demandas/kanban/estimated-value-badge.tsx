import { cn } from "@/lib/utils";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type Props = {
  value: number | null | undefined;
  className?: string;
};

/**
 * Exibe o valor estimado da demanda.
 *
 * ⚠ Apenas informativo — NÃO representa comissão nem pagamento.
 *    O fechamento de RV/comissão não está implementado neste módulo.
 */
export function EstimatedValueBadge({ value, className }: Props) {
  if (value == null || value <= 0) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-mono font-medium text-slate-600",
        className,
      )}
    >
      {BRL.format(value)}
    </span>
  );
}
