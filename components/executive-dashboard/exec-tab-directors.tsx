"use client";

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ExecDirectorPoint } from "@/services/executiveDashboardService";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const NUM = new Intl.NumberFormat("pt-BR");

type Props = {
  byDirector:      ExecDirectorPoint[];
  rankingDirectors:ExecDirectorPoint[];
};

export function ExecTabDirectors({ byDirector, rankingDirectors }: Props) {
  if (byDirector.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Nenhum diretor no período.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gráfico */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Diretores — Valor Interno e Economia (R$)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byDirector} margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="directorName" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v, name) =>
                  name === "Demandas" ? [NUM.format(Number(v)), name] : [BRL.format(Number(v)), name]
                }
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="value"          name="Valor Interno"  fill="#007EB5" radius={[3,3,0,0]} />
              <Bar dataKey="benchmarkValue" name="Benchmark"      fill="#64748B" radius={[3,3,0,0]} />
              <Bar dataKey="economy"        name="Economia"       fill="#16A34A" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Ranking table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Ranking Diretores</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Diretor</TableHead>
                  <TableHead className="text-right">Dem.</TableHead>
                  <TableHead className="text-right">Horas</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Benchmark</TableHead>
                  <TableHead className="text-right">Economia</TableHead>
                  <TableHead className="text-right">Áreas</TableHead>
                  <TableHead className="text-right">Colaboradores</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankingDirectors.map((d, i) => (
                  <TableRow key={d.directorId ?? "__SEM__"}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{d.directorName}</TableCell>
                    <TableCell className="text-right">{NUM.format(d.demands)}</TableCell>
                    <TableCell className="text-right">{NUM.format(Math.round(d.hours))}h</TableCell>
                    <TableCell className="text-right">{BRL.format(d.value)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{BRL.format(d.benchmarkValue)}</TableCell>
                    <TableCell className="text-right text-emerald-600 dark:text-emerald-400">{BRL.format(d.economy)}</TableCell>
                    <TableCell className="text-right">{NUM.format(d.areas)}</TableCell>
                    <TableCell className="text-right">{NUM.format(d.collaborators)}</TableCell>
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
