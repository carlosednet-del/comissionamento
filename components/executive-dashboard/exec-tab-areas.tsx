"use client";

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ExecAreaPoint } from "@/services/executiveDashboardService";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const NUM = new Intl.NumberFormat("pt-BR");

type Props = {
  byArea:      ExecAreaPoint[];
  rankingAreas:ExecAreaPoint[];
};

export function ExecTabAreas({ byArea, rankingAreas }: Props) {
  if (byArea.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Nenhuma área no período.
      </div>
    );
  }

  const top10 = [...byArea].sort((a, b) => b.demands - a.demands).slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Gráfico demandas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Top 10 Áreas — Demandas e Valor (R$)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={top10} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="area" tick={{ fontSize: 10 }} width={160} />
              <Tooltip
                formatter={(v, name) =>
                  name === "Demandas" ? [NUM.format(Number(v)), name] : [BRL.format(Number(v)), name]
                }
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="value"   name="Valor Interno" fill="hsl(var(--chart-3))" radius={[0,3,3,0]} />
              <Bar dataKey="economy" name="Economia"      fill="hsl(var(--chart-5))" radius={[0,3,3,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Ranking table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Ranking Áreas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead className="text-right">Dem.</TableHead>
                  <TableHead className="text-right">Horas</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Economia</TableHead>
                  <TableHead className="text-right">Ticket Médio</TableHead>
                  <TableHead className="text-right">Colaboradores</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankingAreas.map((a, i) => (
                  <TableRow key={a.area}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium text-sm max-w-[160px] truncate">{a.area}</TableCell>
                    <TableCell className="text-right">{NUM.format(a.demands)}</TableCell>
                    <TableCell className="text-right">{NUM.format(Math.round(a.hours))}h</TableCell>
                    <TableCell className="text-right">{BRL.format(a.value)}</TableCell>
                    <TableCell className="text-right text-emerald-600 dark:text-emerald-400">{BRL.format(a.economy)}</TableCell>
                    <TableCell className="text-right">{BRL.format(a.averageTicket)}</TableCell>
                    <TableCell className="text-right">{NUM.format(a.collaborators)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
