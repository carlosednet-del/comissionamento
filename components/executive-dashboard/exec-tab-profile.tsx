"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  Legend, CartesianGrid, Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  ExecSeniorityPoint,
  ExecSpecialtyPoint,
  ExecMonthSeniorityPoint,
  ExecMonthSpecialtyPoint,
  CollaboratorMonthRow,
} from "@/services/executiveDashboardService";

// ── Paletas ───────────────────────────────────────────────────────

const SENIORITY_ORDER  = ["JUNIOR", "PLENO", "SENIOR", "ESPECIALISTA", "Sem senioridade"];
const SENIORITY_LABEL: Record<string, string> = {
  JUNIOR:            "Júnior",
  PLENO:             "Pleno",
  SENIOR:            "Sênior",
  ESPECIALISTA:      "Especialista",
  "Sem senioridade": "Sem senioridade",
};
const SENIORITY_COLOR: Record<string, string> = {
  JUNIOR:            "#38BDF8",
  PLENO:             "#007EB5",
  SENIOR:            "#315A70",
  ESPECIALISTA:      "#7C3AED",
  "Sem senioridade": "#94A3B8",
};

const SPECIALTY_PALETTE = [
  "#315A70", "#007EB5", "#3F8298", "#16A34A",
  "#7C3AED", "#F59E0B", "#E11D48", "#0F766E",
  "#6366F1", "#64748B",
];

// ── Formatters ────────────────────────────────────────────────────

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const NUM = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

type Metric = "value" | "hours" | "demands";

// ── Props ─────────────────────────────────────────────────────────

type Props = {
  bySeniority:             ExecSeniorityPoint[];
  bySpecialty:             ExecSpecialtyPoint[];
  byMonthAndSeniority:     ExecMonthSeniorityPoint[];
  byMonthAndSpecialty:     ExecMonthSpecialtyPoint[];
  collaboratorMonthMatrix: CollaboratorMonthRow[];
  allMonths:               { yearMonth: string; monthLabel: string }[];
};

// ── Helpers ───────────────────────────────────────────────────────

function fmtMetric(v: number, m: Metric) {
  if (m === "value")   return BRL.format(v);
  if (m === "hours")   return `${NUM.format(v)}h`;
  return NUM.format(v);
}

function metricKey(m: Metric): "estimatedValue" | "hours" | "demands" {
  if (m === "value") return "estimatedValue";
  if (m === "hours") return "hours";
  return "demands";
}

// ── KPI card ─────────────────────────────────────────────────────

function KpiCard({ label, title, subtitle }: { label: string; title: string; subtitle: string }) {
  return (
    <Card className="flex-1 min-w-[160px]">
      <CardContent className="pt-5 pb-4 px-4 space-y-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

// ── Tooltip formatter helper ──────────────────────────────────────

function tooltipFormatter(metric: Metric) {
  return (value: unknown) => [fmtMetric(Number(value), metric)];
}

// ── Componente principal ──────────────────────────────────────────

export function ExecTabProfile({
  bySeniority, bySpecialty, byMonthAndSeniority, byMonthAndSpecialty,
  collaboratorMonthMatrix, allMonths,
}: Props) {
  const [metric, setMetric] = useState<Metric>("value");

  // ── KPI helpers (sem hooks, apenas variáveis) ─────────────────────
  const topSeniorityByValue   = bySeniority[0] ?? null;
  const topSpecialtyByValue   = bySpecialty[0] ?? null;
  const topSeniorityByHours   = [...bySeniority].sort((a, b) => b.hours - a.hours)[0] ?? null;
  const topSpecialtyByDemands = [...bySpecialty].sort((a, b) => b.demands - a.demands)[0] ?? null;
  const topByProductivity     = [...bySeniority].sort((a, b) => b.productivityPerCollaborator - a.productivityPerCollaborator)[0] ?? null;
  const topSpecialtyByEconomy = [...bySpecialty].sort((a, b) => b.economy - a.economy)[0] ?? null;

  // ── Todos os hooks ANTES de qualquer return ───────────────────────
  const seniorityKeys = useMemo(
    () => SENIORITY_ORDER.filter((k) => bySeniority.some((s) => s.seniority === k)),
    [bySeniority],
  );

  const seniorityMonthData = useMemo(() => {
    const mk = metricKey(metric);
    const map = new Map<string, Record<string, number | string>>();
    for (const pt of byMonthAndSeniority) {
      if (!map.has(pt.yearMonth)) {
        map.set(pt.yearMonth, { yearMonth: pt.yearMonth, label: pt.monthLabel });
      }
      map.get(pt.yearMonth)![pt.seniority] = pt[mk];
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  }, [byMonthAndSeniority, metric]);

  const specialtyKeys = useMemo(
    () => bySpecialty.slice(0, 8).map((s) => s.specialty),
    [bySpecialty],
  );

  const specialtyMonthData = useMemo(() => {
    const mk = metricKey(metric);
    const map = new Map<string, Record<string, number | string>>();
    const topSet = new Set(specialtyKeys);
    for (const pt of byMonthAndSpecialty) {
      if (!topSet.has(pt.specialty)) continue;
      if (!map.has(pt.yearMonth)) {
        map.set(pt.yearMonth, { yearMonth: pt.yearMonth, label: pt.monthLabel });
      }
      map.get(pt.yearMonth)![pt.specialty] = pt[mk];
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  }, [byMonthAndSpecialty, specialtyKeys, metric]);

  const seniorityBarData = useMemo(
    () => bySeniority.map((s) => ({
      name:  SENIORITY_LABEL[s.seniority] ?? s.seniority,
      key:   s.seniority,
      value: s[metricKey(metric)],
    })),
    [bySeniority, metric],
  );

  const specialtyBarData = useMemo(
    () => bySpecialty.map((s, i) => ({
      name:  s.specialty,
      value: s[metricKey(metric)],
      color: SPECIALTY_PALETTE[i % SPECIALTY_PALETTE.length],
    })),
    [bySpecialty, metric],
  );

  const metricLabel = metric === "value" ? "Valor Interno" : metric === "hours" ? "Horas" : "Demandas";

  const hasData = bySeniority.length > 0 || bySpecialty.length > 0;

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Nenhum dado disponível no período.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="flex flex-wrap gap-3">
        <KpiCard
          label="Senioridade · maior valor"
          title={topSeniorityByValue ? `${SENIORITY_LABEL[topSeniorityByValue.seniority] ?? topSeniorityByValue.seniority}` : "Sem dados"}
          subtitle={topSeniorityByValue ? BRL.format(topSeniorityByValue.estimatedValue) : ""}
        />
        <KpiCard
          label="Especialidade · maior valor"
          title={topSpecialtyByValue?.specialty ?? "Sem dados"}
          subtitle={topSpecialtyByValue ? BRL.format(topSpecialtyByValue.estimatedValue) : ""}
        />
        <KpiCard
          label="Maior produtividade média"
          title={topByProductivity ? `${SENIORITY_LABEL[topByProductivity.seniority] ?? topByProductivity.seniority}` : "Sem dados"}
          subtitle={topByProductivity ? `${NUM.format(topByProductivity.productivityPerCollaborator)} dem/colab` : ""}
        />
        <KpiCard
          label="Maior economia · especialidade"
          title={topSpecialtyByEconomy?.specialty ?? "Sem dados"}
          subtitle={topSpecialtyByEconomy ? BRL.format(topSpecialtyByEconomy.economy) : ""}
        />
        <KpiCard
          label="Senioridade · mais horas"
          title={topSeniorityByHours ? `${SENIORITY_LABEL[topSeniorityByHours.seniority] ?? topSeniorityByHours.seniority}` : "Sem dados"}
          subtitle={topSeniorityByHours ? `${Math.round(topSeniorityByHours.hours)}h` : ""}
        />
        <KpiCard
          label="Especialidade · mais demandas"
          title={topSpecialtyByDemands?.specialty ?? "Sem dados"}
          subtitle={topSpecialtyByDemands ? `${topSpecialtyByDemands.demands} demandas` : ""}
        />
      </div>

      {/* Seletor de métrica */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Métrica:</span>
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

      {/* Gráfico 1: Produtividade mensal por senioridade (Stacked) */}
      {seniorityMonthData.length > 0 && seniorityKeys.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Produtividade mensal por senioridade</CardTitle>
            <CardDescription className="text-xs">Comparativo mensal de entregas por nível técnico</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={seniorityMonthData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => metric === "value" ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                <Tooltip formatter={tooltipFormatter(metric)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {seniorityKeys.map((key) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    name={SENIORITY_LABEL[key] ?? key}
                    stackId="a"
                    fill={SENIORITY_COLOR[key] ?? "#94A3B8"}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Gráfico 2: Produtividade mensal por especialidade */}
      {specialtyMonthData.length > 0 && specialtyKeys.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Produtividade mensal por especialidade</CardTitle>
            <CardDescription className="text-xs">Entregas homologadas agrupadas por especialidade técnica</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={specialtyMonthData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => metric === "value" ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                <Tooltip formatter={tooltipFormatter(metric)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {specialtyKeys.map((key, i) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    name={key}
                    fill={SPECIALTY_PALETTE[i % SPECIALTY_PALETTE.length]}
                    radius={[2, 2, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Gráficos 3 e 4 lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 3: Total por senioridade */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">{metricLabel} por senioridade</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={seniorityBarData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => metric === "value" ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                <Tooltip
                  formatter={(v) => [fmtMetric(Number(v), metric), metricLabel]}
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                  {seniorityBarData.map((entry) => (
                    <Cell key={entry.key} fill={SENIORITY_COLOR[entry.key] ?? "#94A3B8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico 4: Total por especialidade (horizontal) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">{metricLabel} por especialidade</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(220, specialtyBarData.length * 28)}>
              <BarChart data={specialtyBarData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => metric === "value" ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                <Tooltip
                  formatter={(v) => [fmtMetric(Number(v), metric), metricLabel]}
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                  {specialtyBarData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico 5: Matriz colaborador × mês */}
      {collaboratorMonthMatrix.length > 0 && allMonths.length > 0 && (
        <ProfileMatrix matrix={collaboratorMonthMatrix} allMonths={allMonths} metric={metric} setMetric={setMetric} />
      )}

      {/* Ranking por especialidade */}
      {bySpecialty.length > 0 && (
        <RankingSpecialty data={bySpecialty} />
      )}

      {/* Ranking por senioridade */}
      {bySeniority.length > 0 && (
        <RankingSeniority data={bySeniority} />
      )}
    </div>
  );
}

// ── Matriz colaborador × mês ──────────────────────────────────────

function ProfileMatrix({
  matrix, allMonths, metric, setMetric,
}: {
  matrix:    CollaboratorMonthRow[];
  allMonths: { yearMonth: string; monthLabel: string }[];
  metric:    Metric;
  setMetric: (m: Metric) => void;
}) {
  function cellVal(row: CollaboratorMonthRow, ym: string): string {
    const cell = row.months.find((m) => m.yearMonth === ym);
    if (!cell || cell.demands === 0) return "—";
    return fmtMetric(cell[metricKey(metric)], metric);
  }

  function totalVal(row: CollaboratorMonthRow): string {
    if (metric === "value")   return BRL.format(row.totalValue);
    if (metric === "hours")   return `${Math.round(row.totalHours)}h`;
    return String(row.totalDemands);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="text-sm font-semibold">Matriz Colaborador × Mês</CardTitle>
            <CardDescription className="text-xs">Evolução mensal de cada colaborador</CardDescription>
          </div>
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
                <TableHead className="min-w-[90px]">Especialidade</TableHead>
                {allMonths.map(({ yearMonth, monthLabel }) => (
                  <TableHead key={yearMonth} className="text-right min-w-[80px] text-xs">{monthLabel}</TableHead>
                ))}
                <TableHead className="text-right font-semibold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrix.map((row) => (
                <TableRow key={row.collaboratorId}>
                  <TableCell className="sticky left-0 bg-card z-10 font-medium text-sm">
                    {row.collaboratorName}
                    {row.seniority && (
                      <span
                        className="ml-1.5 text-[10px] font-semibold px-1 py-0.5 rounded"
                        style={{ background: `${SENIORITY_COLOR[row.seniority] ?? "#94A3B8"}22`, color: SENIORITY_COLOR[row.seniority] ?? "#94A3B8" }}
                      >
                        {SENIORITY_LABEL[row.seniority] ?? row.seniority}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{row.specialty ?? "—"}</TableCell>
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

// ── Ranking por especialidade ─────────────────────────────────────

function RankingSpecialty({ data }: { data: ExecSpecialtyPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Ranking por Especialidade</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>Especialidade</TableHead>
                <TableHead className="text-right">Colab.</TableHead>
                <TableHead className="text-right">Dem.</TableHead>
                <TableHead className="text-right">Horas</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Benchmark</TableHead>
                <TableHead className="text-right">Economia</TableHead>
                <TableHead className="text-right">Ticket Médio</TableHead>
                <TableHead className="text-right">Custo/h</TableHead>
                <TableHead className="text-right">Dem/colab</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((s, i) => (
                <TableRow key={s.specialty}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="text-xs font-normal"
                      style={{ backgroundColor: `${SPECIALTY_PALETTE[i % SPECIALTY_PALETTE.length]}22`, color: SPECIALTY_PALETTE[i % SPECIALTY_PALETTE.length] }}
                    >
                      {s.specialty}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{s.collaborators}</TableCell>
                  <TableCell className="text-right">{s.demands}</TableCell>
                  <TableCell className="text-right">{Math.round(s.hours)}h</TableCell>
                  <TableCell className="text-right">{BRL.format(s.estimatedValue)}</TableCell>
                  <TableCell className="text-right">{BRL.format(s.benchmarkValue)}</TableCell>
                  <TableCell className="text-right text-emerald-600 dark:text-emerald-400">{BRL.format(s.economy)}</TableCell>
                  <TableCell className="text-right">{BRL.format(s.averageTicket)}</TableCell>
                  <TableCell className="text-right">{BRL.format(s.averageHourlyCost)}/h</TableCell>
                  <TableCell className="text-right">{NUM.format(s.productivityPerCollaborator)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Ranking por senioridade ───────────────────────────────────────

function RankingSeniority({ data }: { data: ExecSeniorityPoint[] }) {
  const ordered = useMemo(() => {
    return [...data].sort((a, b) => {
      const ai = SENIORITY_ORDER.indexOf(a.seniority);
      const bi = SENIORITY_ORDER.indexOf(b.seniority);
      if (ai !== -1 && bi !== -1) return ai - bi;
      return b.estimatedValue - a.estimatedValue;
    });
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Ranking por Senioridade</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Senioridade</TableHead>
                <TableHead className="text-right">Colab.</TableHead>
                <TableHead className="text-right">Dem.</TableHead>
                <TableHead className="text-right">Horas</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Benchmark</TableHead>
                <TableHead className="text-right">Economia</TableHead>
                <TableHead className="text-right">Ticket Médio</TableHead>
                <TableHead className="text-right">Custo/h</TableHead>
                <TableHead className="text-right">Dem/colab</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordered.map((s) => (
                <TableRow key={s.seniority}>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="text-xs"
                      style={{
                        backgroundColor: `${SENIORITY_COLOR[s.seniority] ?? "#94A3B8"}22`,
                        color: SENIORITY_COLOR[s.seniority] ?? "#94A3B8",
                      }}
                    >
                      {SENIORITY_LABEL[s.seniority] ?? s.seniority}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{s.collaborators}</TableCell>
                  <TableCell className="text-right">{s.demands}</TableCell>
                  <TableCell className="text-right">{Math.round(s.hours)}h</TableCell>
                  <TableCell className="text-right">{BRL.format(s.estimatedValue)}</TableCell>
                  <TableCell className="text-right">{BRL.format(s.benchmarkValue)}</TableCell>
                  <TableCell className="text-right text-emerald-600 dark:text-emerald-400">{BRL.format(s.economy)}</TableCell>
                  <TableCell className="text-right">{BRL.format(s.averageTicket)}</TableCell>
                  <TableCell className="text-right">{BRL.format(s.averageHourlyCost)}/h</TableCell>
                  <TableCell className="text-right">{NUM.format(s.productivityPerCollaborator)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
