"use client";

import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis,
  Tooltip, Legend, CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExecMonthlyPoint } from "@/services/executiveDashboardService";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const NUM = new Intl.NumberFormat("pt-BR");

function currency(v: number) { return BRL.format(v); }
function fmt(v: number)      { return NUM.format(v); }

type Props = {
  monthlySeries: ExecMonthlyPoint[];
};

export function ExecTabOverview({ monthlySeries }: Props) {
  if (monthlySeries.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Nenhum dado encontrado para o período selecionado.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Demandas e Horas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Demandas e Horas por Mês</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={monthlySeries} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left"  tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value, name) =>
                  name === "Horas" ? [`${fmt(Number(value))}h`, name] : [fmt(Number(value)), name]
                }
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar    yAxisId="left"  dataKey="demands" name="Demandas" fill="hsl(var(--chart-1))" radius={[3,3,0,0]} />
              <Line   yAxisId="right" dataKey="hours"   name="Horas"    stroke="hsl(var(--chart-2))" dot={false} strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Valor Interno vs Benchmark */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Valor Interno vs Benchmark de Mercado (R$)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={monthlySeries} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => currency(Number(v))} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar  dataKey="value"          name="Valor Interno"  fill="hsl(var(--chart-3))" radius={[3,3,0,0]} />
              <Bar  dataKey="benchmarkValue" name="Benchmark"      fill="hsl(var(--chart-4))" radius={[3,3,0,0]} />
              <Line dataKey="economy"        name="Economia"       stroke="hsl(var(--chart-5))" dot={false} strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
