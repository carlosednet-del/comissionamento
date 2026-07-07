"use client";

import { useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ExecCollabPoint, CollaboratorMonthRow } from "@/services/executiveDashboardService";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const NUM = new Intl.NumberFormat("pt-BR");

const SENIORITY_LABEL: Record<string, string> = {
  JUNIOR:       "Júnior",
  PLENO:        "Pleno",
  SENIOR:       "Sênior",
  ESPECIALISTA: "Especialista",
};

const SENIORITY_COLOR: Record<string, string> = {
  JUNIOR:       "#38BDF8",
  PLENO:        "#007EB5",
  SENIOR:       "#315A70",
  ESPECIALISTA: "#7C3AED",
};

type Metric = "value" | "hours" | "demands";

type Props = {
  byCollaborator:          ExecCollabPoint[];
  rankingCollaborators:    ExecCollabPoint[];
  collaboratorMonthMatrix: CollaboratorMonthRow[];
  allMonths:               { yearMonth: string; monthLabel: string }[];
};

export function ExecTabCollaborators({ byCollaborator, rankingCollaborators, collaboratorMonthMatrix, allMonths }: Props) {
  const [metric, setMetric] = useState<Metric>("value");

  if (byCollaborator.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Nenhum colaborador no período.
      </div>
    );
  }

  const top10 = [...byCollaborator].sort((a, b) => b.value - a.value).slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Gráfico top 10 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Top 10 Colaboradores — Valor Interno (R$)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={top10} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="collaboratorName" tick={{ fontSize: 11 }} width={120} />
              <Tooltip
                formatter={(v, name) =>
                  name === "Demandas" ? [NUM.format(Number(v)), name] : [BRL.format(Number(v)), name]
                }
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="value"   name="Valor Interno" fill="#007EB5" radius={[0, 3, 3, 0]} />
              <Bar dataKey="economy" name="Economia"      fill="#16A34A" radius={[0, 3, 3, 0]} />
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
                  <TableHead>Senioridade</TableHead>
                  <TableHead>Especialidade</TableHead>
                  <TableHead className="text-right">Dem.</TableHead>
                  <TableHead className="text-right">Horas</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Economia</TableHead>
                  <TableHead className="text-right">Ticket Médio</TableHead>
                  <TableHead className="text-right">Custo/h</TableHead>
                  <TableHead className="text-right">Meses</TableHead>
                  <TableHead>Top Área</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankingCollaborators.map((c, i) => (
                  <TableRow key={c.collaboratorId}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{c.collaboratorName}</TableCell>
                    <TableCell>
                      {c.seniority ? (
                        <Badge
                          variant="secondary"
                          className="text-xs"
                          style={{ backgroundColor: `${SENIORITY_COLOR[c.seniority] ?? "#94A3B8"}22`, color: SENIORITY_COLOR[c.seniority] ?? "#94A3B8" }}
                        >
                          {SENIORITY_LABEL[c.seniority] ?? c.seniority}
                        </Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      {c.specialty ? (
                        <span className="text-xs text-muted-foreground">{c.specialty}</span>
                      ) : <span className="text-xs text-muted-foreground/50">—</span>}
                    </TableCell>
                    <TableCell className="text-right">{NUM.format(c.demands)}</TableCell>
                    <TableCell className="text-right">{NUM.format(Math.round(c.hours))}h</TableCell>
                    <TableCell className="text-right">{BRL.format(c.value)}</TableCell>
                    <TableCell className="text-right text-emerald-600 dark:text-emerald-400">{BRL.format(c.economy)}</TableCell>
                    <TableCell className="text-right">{BRL.format(c.averageTicket)}</TableCell>
                    <TableCell className="text-right">{BRL.format(c.averageHourlyCost)}/h</TableCell>
                    <TableCell className="text-right">{c.activeMonths}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{c.topArea ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Matriz colaborador × mês */}
      {collaboratorMonthMatrix.length > 0 && allMonths.length > 0 && (
        <CollaboratorMatrix matrix={collaboratorMonthMatrix} allMonths={allMonths} metric={metric} setMetric={setMetric} />
      )}
    </div>
  );
}

// ── Matriz ────────────────────────────────────────────────────────

function CollaboratorMatrix({
  matrix, allMonths, metric, setMetric,
}: {
  matrix:    CollaboratorMonthRow[];
  allMonths: { yearMonth: string; monthLabel: string }[];
  metric:    Metric;
  setMetric: (m: Metric) => void;
}) {
  const BRL2 = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  function cellVal(row: CollaboratorMonthRow, ym: string): string {
    const cell = row.months.find((m) => m.yearMonth === ym);
    if (!cell || cell.demands === 0) return "—";
    if (metric === "value")   return BRL2.format(cell.estimatedValue);
    if (metric === "hours")   return `${Math.round(cell.hours)}h`;
    return String(cell.demands);
  }

  function totalVal(row: CollaboratorMonthRow): string {
    if (metric === "value")   return BRL2.format(row.totalValue);
    if (metric === "hours")   return `${Math.round(row.totalHours)}h`;
    return String(row.totalDemands);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-sm font-semibold">Colaborador × Mês</CardTitle>
          <div className="flex items-center gap-1">
            {(["value", "hours", "demands"] as Metric[]).map((m) => (
              <Button
                key={m}
                variant={metric === m ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setMetric(m)}
              >
                {m === "value" ? "Valor" : m === "hours" ? "Horas" : "Demandas"}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-card z-10 min-w-[140px]">Colaborador</TableHead>
                {allMonths.map(({ yearMonth, monthLabel }) => (
                  <TableHead key={yearMonth} className="text-right min-w-[80px] text-xs">{monthLabel}</TableHead>
                ))}
                <TableHead className="text-right font-semibold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrix.map((row) => (
                <TableRow key={row.collaboratorId}>
                  <TableCell className="sticky left-0 bg-card z-10 font-medium text-sm">{row.collaboratorName}</TableCell>
                  {allMonths.map(({ yearMonth }) => (
                    <TableCell key={yearMonth} className="text-right text-xs tabular-nums">
                      {cellVal(row, yearMonth)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-semibold text-xs tabular-nums">{totalVal(row)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
