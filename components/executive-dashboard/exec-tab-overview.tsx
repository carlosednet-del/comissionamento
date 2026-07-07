"use client";

import {
  ResponsiveContainer, ComposedChart, BarChart, Bar, Line, XAxis, YAxis,
  Tooltip, Legend, CartesianGrid, PieChart, Pie, Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import type {
  ExecMonthlyPoint, ExecCollabPoint, ExecAreaPoint, ExecDemandRow,
  ExecIncomingVsHomologated, ExecDeadlineStats, ExecStatusCount,
} from "@/services/executiveDashboardService";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const NUM = new Intl.NumberFormat("pt-BR");

const SENIORITY_LABEL: Record<string, string> = {
  JUNIOR: "Júnior", PLENO: "Pleno", SENIOR: "Sênior", ESPECIALISTA: "Especialista",
};
const SENIORITY_COLOR: Record<string, string> = {
  JUNIOR: "#38BDF8", PLENO: "#007EB5", SENIOR: "#315A70", ESPECIALISTA: "#7C3AED",
};
const AREA_COLORS = ["#007EB5", "#7C3AED", "#16A34A", "#F59E0B", "#E11D48", "#0F766E", "#6366F1", "#64748B"];

type Props = {
  monthlySeries:          ExecMonthlyPoint[];
  rankingCollaborators:   ExecCollabPoint[];
  rankingAreas:           ExecAreaPoint[];
  demands:                ExecDemandRow[];
  incomingVsHomologated:  ExecIncomingVsHomologated[];
  deadlineStats:          ExecDeadlineStats;
  byStatus:               ExecStatusCount[];
};

export function ExecTabOverview({ monthlySeries, rankingCollaborators, rankingAreas, demands, incomingVsHomologated, deadlineStats, byStatus }: Props) {
  if (monthlySeries.length === 0 && rankingCollaborators.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Nenhum dado encontrado para o período selecionado.
      </div>
    );
  }

  const top5Collabs = [...rankingCollaborators].sort((a, b) => b.value - a.value).slice(0, 5);
  const top5Areas   = [...rankingAreas].sort((a, b) => b.value - a.value).slice(0, 5);
  const top5Demands = [...demands].sort((a, b) => b.estimatedDemandValue - a.estimatedDemandValue).slice(0, 5);
  const areaDonut   = top5Areas.map((a) => ({ name: a.area, value: a.demands }));

  return (
    <div className="space-y-4">
      {/* Linha 1: Evolução mensal + Valor vs Mercado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-sm border-0 ring-1 ring-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Evolução mensal de produtividade</CardTitle>
            <CardDescription className="text-xs">Demandas homologadas e horas entregues por mês</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={monthlySeries} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left"  tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value, name) =>
                    name === "Horas" ? [`${NUM.format(Number(value))}h`, name] : [NUM.format(Number(value)), name]
                  }
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar    yAxisId="left"  dataKey="demands" name="Demandas" fill="#007EB5" radius={[3,3,0,0]} />
                <Line   yAxisId="right" dataKey="hours"   name="Horas"    stroke="#7C3AED" dot={{ r: 3 }} strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0 ring-1 ring-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Valor interno vs benchmark de mercado</CardTitle>
            <CardDescription className="text-xs">Comparativo mensal de custo interno e referência de mercado</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={monthlySeries} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => [BRL.format(Number(v))]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar  dataKey="value"          name="Valor Interno" fill="#007EB5" radius={[3,3,0,0]} />
                <Bar  dataKey="benchmarkValue" name="Benchmark"     fill="#64748B" radius={[3,3,0,0]} />
                <Line dataKey="economy"        name="Economia"      stroke="#16A34A" dot={{ r: 3 }} strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Linha 2: Top colaboradores + Demandas por área */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-sm border-0 ring-1 ring-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Top colaboradores por valor gerado</CardTitle>
            <CardDescription className="text-xs">Valor interno acumulado no período</CardDescription>
          </CardHeader>
          <CardContent>
            {top5Collabs.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={top5Collabs} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="collaboratorName" tick={{ fontSize: 11 }} width={110} />
                  <Tooltip
                    formatter={(v, name) => name === "Demandas" ? [NUM.format(Number(v)), name] : [BRL.format(Number(v)), name]}
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="value" name="Valor Interno" radius={[0,3,3,0]}>
                    {top5Collabs.map((entry, i) => (
                      <Cell key={entry.collaboratorId} fill={["#7C3AED","#315A70","#007EB5","#3F8298","#6366F1"][i % 5]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0 ring-1 ring-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Demandas por área</CardTitle>
            <CardDescription className="text-xs">Distribuição de demandas homologadas por área solicitante</CardDescription>
          </CardHeader>
          <CardContent>
            {areaDonut.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie
                      data={areaDonut}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {areaDonut.map((_, i) => (
                        <Cell key={i} fill={AREA_COLORS[i % AREA_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => [NUM.format(Number(v)), "Demandas"]}
                      contentStyle={{ borderRadius: 8, fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {areaDonut.map((item, i) => {
                    const total = areaDonut.reduce((s, x) => s + x.value, 0);
                    return (
                      <div key={item.name} className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: AREA_COLORS[i % AREA_COLORS.length] }} />
                          <span className="truncate text-muted-foreground">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-medium">{item.value}</span>
                          <span className="text-muted-foreground/60">({total > 0 ? Math.round(item.value/total*100) : 0}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Linha 3: Entrantes vs Homologadas + % Prazo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Gráfico 1: Entrantes vs Homologadas */}
        <Card className="shadow-sm border-0 ring-1 ring-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Demandas entrantes vs homologadas</CardTitle>
            <CardDescription className="text-xs">
              Criadas (data de abertura) × entregues para produção — por mês
            </CardDescription>
          </CardHeader>
          <CardContent>
            {incomingVsHomologated.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={incomingVsHomologated} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    formatter={(v, name) => [NUM.format(Number(v)), name]}
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="incoming"    name="Entrantes"    fill="#64748B" radius={[3,3,0,0]} />
                  <Bar dataKey="homologated" name="Homologadas"  fill="#16A34A" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Gráfico 2: % dentro/fora do prazo */}
        <Card className="shadow-sm border-0 ring-1 ring-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Aderência ao prazo</CardTitle>
            <CardDescription className="text-xs">
              Demandas homologadas dentro e fora do prazo planejado
            </CardDescription>
          </CardHeader>
          <CardContent>
            {deadlineStats.total === 0 ? (
              <div className="h-[200px] flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
                <span>Sem dados de prazo planejado</span>
                {deadlineStats.noDeadline > 0 && (
                  <span className="text-xs">{deadlineStats.noDeadline} demanda(s) sem prazo definido</span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Dentro do prazo", value: deadlineStats.onTime },
                        { name: "Fora do prazo",   value: deadlineStats.late  },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      <Cell fill="#16A34A" />
                      <Cell fill="#E11D48" />
                    </Pie>
                    <Tooltip
                      formatter={(v) => [NUM.format(Number(v)), "Demandas"]}
                      contentStyle={{ borderRadius: 8, fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="flex-1 space-y-4">
                  {/* Dentro do prazo */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600 inline-block" />
                        Dentro do prazo
                      </span>
                      <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                        {Math.round(deadlineStats.onTimePct * 100)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-600"
                        style={{ width: `${Math.round(deadlineStats.onTimePct * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {NUM.format(deadlineStats.onTime)} de {NUM.format(deadlineStats.total)} demandas
                    </p>
                  </div>

                  {/* Fora do prazo */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-400">
                        <span className="h-2.5 w-2.5 rounded-sm bg-rose-600 inline-block" />
                        Fora do prazo
                      </span>
                      <span className="text-sm font-bold text-rose-700 dark:text-rose-400">
                        {Math.round(deadlineStats.latePct * 100)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-rose-600"
                        style={{ width: `${Math.round(deadlineStats.latePct * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {NUM.format(deadlineStats.late)} de {NUM.format(deadlineStats.total)} demandas
                    </p>
                  </div>

                  {deadlineStats.noDeadline > 0 && (
                    <p className="text-xs text-muted-foreground/70">
                      + {NUM.format(deadlineStats.noDeadline)} sem prazo definido
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráfico: Demandas por status do Kanban */}
      {byStatus.length > 0 && (
        <Card className="shadow-sm border-0 ring-1 ring-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Demandas por status do Kanban</CardTitle>
            <CardDescription className="text-xs">
              Volume de demandas criadas no período, agrupadas por estágio atual no pipeline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byStatus} margin={{ top: 4, right: 16, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  formatter={(v) => [NUM.format(Number(v)), "Demandas"]}
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="count" name="Demandas" radius={[4, 4, 0, 0]} maxBarSize={56}>
                  {byStatus.map((entry) => (
                    <Cell key={entry.status} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Tabela Top 5 entregas */}
      {top5Demands.length > 0 && (
        <Card className="shadow-sm border-0 ring-1 ring-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Top 5 entregas do período</CardTitle>
            <CardDescription className="text-xs">Demandas com maior valor interno homologadas no período</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Demanda</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Senioridade</TableHead>
                    <TableHead>Especialidade</TableHead>
                    <TableHead className="text-right">Horas</TableHead>
                    <TableHead className="text-right">Valor interno</TableHead>
                    <TableHead className="text-right text-emerald-700">Economia</TableHead>
                    <TableHead className="text-right">% Econ.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {top5Demands.map((d, i) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium text-sm max-w-[200px] truncate" title={d.title}>{d.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{d.requesterArea}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{d.assigneeName ?? "—"}</TableCell>
                      <TableCell>
                        {d.assigneeProfile ? (
                          <span
                            className="text-xs font-medium px-1.5 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${SENIORITY_COLOR[d.assigneeProfile] ?? "#94A3B8"}22`,
                              color: SENIORITY_COLOR[d.assigneeProfile] ?? "#94A3B8",
                            }}
                          >
                            {SENIORITY_LABEL[d.assigneeProfile] ?? d.assigneeProfile}
                          </span>
                        ) : <span className="text-xs text-muted-foreground/50">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{d.assigneeSpecialty ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{Math.round(d.estimatedHours)}h</TableCell>
                      <TableCell className="text-right tabular-nums text-sm font-medium">{BRL.format(d.estimatedDemandValue)}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm text-emerald-600 dark:text-emerald-400">{BRL.format(d.economy)}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                        {Math.round(d.economyPercent * 100)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
