"use client";

import type { WorkerProfile } from "@prisma/client";
import { calculateBenchmarkEconomy } from "@/lib/benchmark/calculateBenchmarkEconomy";
import { TEAM_ACCELERATOR } from "@/lib/benchmark/benchmarkRates";
import { WORKER_PROFILE_LABELS } from "@/lib/demand-pricing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BarChart3, TrendingDown, TrendingUp, Minus } from "lucide-react";

type Props = {
  estimatedHours:        number;
  workerProfile:         WorkerProfile;
  ourHourlyRate?:        number;
  ourValue?:             number;
  complexityMultiplier?: number;
  roiMultiplier?:        number;
  teamAccelerator?:      number;
  marketHourlyRate?:     number;
  isCorrectionOnly?:     boolean;
};

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const PCT = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs tabular-nums ${highlight ? "font-semibold text-blue-800" : "font-medium"}`}>
        {value}
      </span>
    </div>
  );
}

const STATUS_CONFIG = {
  COM_ECONOMIA: {
    label: "Com economia",
    Icon: TrendingDown,
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  ACIMA_DO_MERCADO: {
    label: "Acima do mercado",
    Icon: TrendingUp,
    cls: "bg-red-100 text-red-700 border-red-200",
  },
  SEM_DIFERENCA: {
    label: "Sem diferença",
    Icon: Minus,
    cls: "bg-gray-100 text-gray-600 border-gray-200",
  },
};

export function BenchmarkSummaryCard({
  estimatedHours,
  workerProfile,
  ourHourlyRate,
  ourValue,
  complexityMultiplier,
  roiMultiplier,
  teamAccelerator,
  marketHourlyRate,
  isCorrectionOnly = false,
}: Props) {
  const result = calculateBenchmarkEconomy({
    estimatedHours,
    workerProfile,
    ourHourlyRate,
    ourValue,
    complexityMultiplier,
    roiMultiplier,
    teamAccelerator,
    marketHourlyRate,
  });

  const accel = teamAccelerator ?? TEAM_ACCELERATOR;
  const { label, Icon, cls } = STATUS_CONFIG[result.status];

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50/60 to-indigo-50/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-blue-800">
            <BarChart3 className="h-4 w-4" />
            Economia x Bench de Mercado
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${cls}`}>
            <Icon className="h-3 w-3" />
            {label}
          </span>
        </CardTitle>
        <p className="text-[11px] text-blue-600 leading-snug">
          Comparativo entre o valor estimado interno da demanda e o custo equivalente de mercado para a mesma senioridade.
        </p>
      </CardHeader>

      <CardContent className="pt-0 space-y-0">
        <Row label="Horas estimadas"      value={`${result.estimatedHours}h`} />
        <Row label="Nível do responsável" value={WORKER_PROFILE_LABELS[result.workerProfile]} />
        <Row label="Valor hora nosso"     value={BRL.format(result.ourHourlyRate)} />
        <Row label="Valor nosso"          value={BRL.format(result.ourValue)} highlight />

        <Separator className="my-1.5 bg-blue-100" />

        <Row label="Valor hora bench"       value={BRL.format(result.marketHourlyRate)} />
        <Row label="Bench mercado base"     value={BRL.format(result.marketBenchBase)} />
        <Row label="Acelerador do time"     value={`${accel}%`} />
        <Row label="Impacto acelerador"     value={PCT.format(result.acceleratorImpact)} />
        <Row label="Bench mercado ajustado" value={BRL.format(result.marketBenchAdjusted)} highlight />

        <Separator className="my-1.5 bg-blue-100" />

        <Row label="Diferença bruta"    value={BRL.format(result.rawDifference)} />
        <Row label="Economia estimada"  value={BRL.format(result.economy)} highlight />
        <Row label="% de economia"      value={PCT.format(result.economyPercent)} highlight />

        {isCorrectionOnly && (
          <p className="text-[10px] text-rose-500 pt-2 leading-snug font-medium">
            Correção — sem valor a pagar. Bench exibe apenas referência de mercado.
          </p>
        )}
        <p className="text-[10px] text-blue-400 pt-2 leading-snug">
          Bench calculado com base no valor hora de mercado por senioridade e ajuste de 10% do acelerador do time.
        </p>
      </CardContent>
    </Card>
  );
}
