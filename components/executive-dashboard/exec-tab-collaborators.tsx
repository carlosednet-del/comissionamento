"use client";

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { ExecCollabPoint } from "@/services/executiveDashboardService";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const NUM = new Intl.NumberFormat("pt-BR");

const PROFILE_LABEL: Record<string, string> = {
  JUNIOR:       "Júnior",
  PLENO:        "Pleno",
  SENIOR:       "Sênior",
  ESPECIALISTA: "Especialista",
};

type Props = {
  byCollaborator:      ExecCollabPoint[];
  rankingCollaborators:ExecCollabPoint[];
};

export function ExecTabCollaborators({ byCollaborator, rankingCollaborators }: Props) {
  if (byCollaborator.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Nenhum colaborador no período.
      </div>
    );
  }

  const top10 = byCollaborator.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Gráfico */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Top 10 Colaboradores — Valor Interno (R$)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={top10} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="collaboratorName" tick={{ fontSize: 11 }} width={120} />
              <Tooltip
                formatter={(v, name) =>
                  name === "Demandas" ? [NUM.format(Number(v)), name] : [BRL.format(Number(v)), name]
                }
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="value"   name="Valor Interno" fill="hsl(var(--chart-1))" radius={[0,3,3,0]} />
              <Bar dataKey="economy" name="Economia"      fill="hsl(var(--chart-2))" radius={[0,3,3,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Ranking table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Ranking Colaboradores</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead className="text-right">Dem.</TableHead>
                  <TableHead className="text-right">Horas</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Economia</TableHead>
                  <TableHead className="text-right">Ticket Médio</TableHead>
                  <TableHead>Top Área</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankingCollaborators.map((c, i) => (
                  <TableRow key={c.collaboratorId}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{c.collaboratorName}</TableCell>
                    <TableCell>
                      {c.profile ? (
                        <Badge variant="secondary" className="text-xs">{PROFILE_LABEL[c.profile] ?? c.profile}</Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-right">{NUM.format(c.demands)}</TableCell>
                    <TableCell className="text-right">{NUM.format(Math.round(c.hours))}h</TableCell>
                    <TableCell className="text-right">{BRL.format(c.value)}</TableCell>
                    <TableCell className="text-right text-emerald-600 dark:text-emerald-400">{BRL.format(c.economy)}</TableCell>
                    <TableCell className="text-right">{BRL.format(c.averageTicket)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{c.topArea ?? "—"}</TableCell>
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
