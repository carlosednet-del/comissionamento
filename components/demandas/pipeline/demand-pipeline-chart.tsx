"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";

const DAY_PX          = 22;
const MONTH_COMPACT_W = 28;
const ROW_H           = 54;
const LEFT_W          = 284;
const HEADER_H        = 48;
const GROUP_H         = 44;

const STATUS_ORDER = [
  "HOMOLOGADA_PRODUCAO", "CONCLUIDA", "EM_DESENVOLVIMENTO",
  "AGUARDANDO_HOMOLOGACAO", "APROVADA", "PRIORIZACAO_DIRETORIA",
  "EM_ANALISE", "ABERTA", "RASCUNHO", "CANCELADA", "REPROVADA",
];

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  RASCUNHO:               { label: "Rascunho",      color: "#94a3b8" },
  ABERTA:                 { label: "Aberta",         color: "#3b82f6" },
  EM_ANALISE:             { label: "Em Análise",     color: "#6366f1" },
  PRIORIZACAO_DIRETORIA:  { label: "Diretoria",      color: "#a855f7" },
  APROVADA:               { label: "Aprovada",       color: "#06b6d4" },
  EM_DESENVOLVIMENTO:     { label: "Em Desenv.",     color: "#f59e0b" },
  AGUARDANDO_HOMOLOGACAO: { label: "Homologação",    color: "#f97316" },
  HOMOLOGADA_PRODUCAO:    { label: "Homologada",     color: "#22c55e" },
  CONCLUIDA:              { label: "Concluída",      color: "#10b981" },
  CANCELADA:              { label: "Cancelada",      color: "#94a3b8" },
  REPROVADA:              { label: "Reprovada",      color: "#ef4444" },
};

const DONE_STATUSES = new Set(["HOMOLOGADA_PRODUCAO", "CONCLUIDA", "CANCELADA", "REPROVADA"]);

function dayStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function monthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function monthEnd(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}
function fmt(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
function fmtMonth(d: Date): string {
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}
function initials(name: string): string {
  return name.split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase();
}

export type PipelineDemand = {
  id:                  string;
  title:               string;
  status:              string;
  priority:            string;
  requesterArea:       string | null;
  estimatedHours:      number | null;
  plannedStartDate:    string | null;
  plannedDeliveryDate: string | null;
  actualStartDate:     string | null;
  actualDeliveryDate:  string | null;
  assignee: { id: string; name: string } | null;
};

type AssigneeGroup = {
  key:          string;
  assigneeName: string;
  demands:      PipelineDemand[];
};

export function DemandPipelineChart({ demands }: { demands: PipelineDemand[] }) {
  const today = useMemo(() => dayStart(new Date()), []);
  const [collapsed, setCollapsed]             = useState<Set<string>>(new Set());
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());

  function toggleGroup(key: string) {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      return next;
    });
  }

  function toggleMonth(label: string) {
    setCollapsedMonths(prev => {
      const next = new Set(prev);
      if (next.has(label)) { next.delete(label); } else { next.add(label); }
      return next;
    });
  }

  const { rangeStart, months } = useMemo(() => {
    const pts: Date[] = [addDays(today, -21), addDays(today, 45)];
    for (const d of demands) {
      if (d.plannedStartDate)    pts.push(dayStart(new Date(d.plannedStartDate)));
      if (d.plannedDeliveryDate) pts.push(dayStart(new Date(d.plannedDeliveryDate)));
    }
    const rangeStart = monthStart(new Date(Math.min(...pts.map(x => x.getTime()))));
    const rawEnd     = new Date(Math.max(...pts.map(x => x.getTime())));
    const rangeEnd   = monthEnd(rawEnd);

    const months: { label: string; off: number; days: number }[] = [];
    let cur = new Date(rangeStart);
    while (cur <= rangeEnd) {
      const ms = monthStart(cur);
      const me = monthEnd(cur);
      months.push({ label: fmtMonth(ms), off: diffDays(rangeStart, ms), days: diffDays(ms, me) + 1 });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
    return { rangeStart, months };
  }, [demands, today]);

  // Pixel widths per month, accounting for collapsed state
  const { monthWidths, monthStartsX, TW } = useMemo(() => {
    const widths = months.map(m =>
      collapsedMonths.has(m.label) ? MONTH_COMPACT_W : m.days * DAY_PX
    );
    const starts: number[] = [];
    let acc = 0;
    for (const w of widths) { starts.push(acc); acc += w; }
    return { monthWidths: widths, monthStartsX: starts, TW: acc };
  }, [months, collapsedMonths]);

  // Convert a date to its x pixel position on the timeline
  function dateToX(date: Date): number {
    for (let i = 0; i < months.length; i++) {
      const m      = months[i];
      const mStart = addDays(rangeStart, m.off);
      const mEnd   = addDays(mStart, m.days - 1);
      if (date <= mEnd) {
        if (collapsedMonths.has(m.label)) return monthStartsX[i] + MONTH_COMPACT_W / 2;
        return monthStartsX[i] + Math.max(0, diffDays(mStart, date)) * DAY_PX;
      }
    }
    return TW;
  }

  // Width of a single day at a given date (0 if month is collapsed)
  function getDayWidth(date: Date): number {
    for (let i = 0; i < months.length; i++) {
      const m      = months[i];
      const mStart = addDays(rangeStart, m.off);
      const mEnd   = addDays(mStart, m.days - 1);
      if (date >= mStart && date <= mEnd) {
        return collapsedMonths.has(m.label) ? 0 : DAY_PX;
      }
    }
    return DAY_PX;
  }

  const groups = useMemo<AssigneeGroup[]>(() => {
    const map = new Map<string, AssigneeGroup>();
    for (const d of demands) {
      const key  = d.assignee?.name ?? "__sem_responsavel__";
      const name = d.assignee?.name ?? "Sem responsável";
      if (!map.has(key)) map.set(key, { key, assigneeName: name, demands: [] });
      map.get(key)!.demands.push(d);
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.key === "__sem_responsavel__") return 1;
      if (b.key === "__sem_responsavel__") return -1;
      return a.assigneeName.localeCompare(b.assigneeName, "pt-BR");
    });
  }, [demands]);

  if (demands.length === 0) {
    return (
      <div className="rounded-lg border bg-background p-16 text-center">
        <p className="text-5xl mb-3">🪨</p>
        <p className="font-semibold text-lg">Nenhuma demanda marcada como Pedra</p>
        <p className="text-sm text-muted-foreground mt-1">
          Marque demandas como Pedra no Kanban para visualizá-las aqui.
        </p>
      </div>
    );
  }

  const MonthLines = () => (
    <>
      {months.map((m, i) => (
        <div
          key={m.label}
          className="absolute top-0 bottom-0 border-r border-muted/40"
          style={{ left: monthStartsX[i] + monthWidths[i] - 1 }}
        />
      ))}
    </>
  );

  const TodayLine = () => {
    const todayX = dateToX(today);
    return todayX >= 0 && todayX <= TW ? (
      <div
        className="absolute top-0 bottom-0 z-10 pointer-events-none"
        style={{ left: todayX, width: 2, background: "#ef4444", opacity: 0.6 }}
      />
    ) : null;
  };

  return (
    <div className="rounded-lg border bg-background overflow-hidden flex flex-col">

      {/* ── Legenda ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-2.5 border-b bg-muted/20 text-[11px] text-muted-foreground">
        {Object.entries(STATUS_CFG).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: v.color }} />
            {v.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 ml-auto">
          <span className="h-2.5 w-2.5 rounded border-2 border-red-400 shrink-0" />
          Atrasada
        </span>
      </div>

      {/* ── Gantt ────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: LEFT_W + TW }}>

          {/* Sticky month header */}
          <div className="flex sticky top-0 z-20 bg-background border-b">
            <div
              className="shrink-0 sticky left-0 z-30 bg-muted/20 border-r flex items-end px-3 pb-2"
              style={{ width: LEFT_W, height: HEADER_H }}
            >
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Demanda
              </span>
            </div>
            <div className="flex" style={{ height: HEADER_H }}>
              {months.map((m, i) => {
                const isMonthCollapsed = collapsedMonths.has(m.label);
                const mStart    = addDays(rangeStart, m.off);
                const mEnd      = addDays(mStart, m.days - 1);
                const hasToday  = today >= mStart && today <= mEnd;
                const todayLocalX = hasToday && !isMonthCollapsed
                  ? dateToX(today) - monthStartsX[i]
                  : null;

                return (
                  <div
                    key={m.label}
                    className="shrink-0 flex items-center justify-center border-r bg-muted/10 relative cursor-pointer select-none hover:bg-muted/20 transition-colors"
                    style={{ width: monthWidths[i], height: HEADER_H }}
                    onClick={() => toggleMonth(m.label)}
                    title={isMonthCollapsed ? `Expandir ${m.label}` : `Recolher ${m.label}`}
                  >
                    {isMonthCollapsed ? (
                      <span
                        className="text-[8px] font-semibold text-muted-foreground"
                        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                      >
                        {m.label}
                      </span>
                    ) : (
                      <>
                        <span className="text-[11px] font-semibold text-muted-foreground">{m.label}</span>
                        <ChevronDown className="h-3 w-3 text-muted-foreground/40 absolute top-1.5 right-1.5" />
                        {todayLocalX !== null && (
                          <span
                            className="absolute bottom-1 text-[9px] font-bold text-red-500"
                            style={{ left: todayLocalX - 10 }}
                          >
                            hoje
                          </span>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Groups ───────────────────────────────────────────────── */}
          {groups.map(group => {
            const isCollapsed = collapsed.has(group.key);

            // Status breakdown for this group
            const statusCounts = group.demands.reduce((acc, d) => {
              acc[d.status] = (acc[d.status] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);
            const statusSummary = STATUS_ORDER
              .filter(s => statusCounts[s])
              .map(s => ({ status: s, count: statusCounts[s] }));

            return (
              <div key={group.key}>

                {/* Group header row */}
                <div
                  className="flex border-b border-t border-border/60"
                  style={{ height: GROUP_H, background: "hsl(var(--muted)/0.45)" }}
                >
                  <div
                    className="shrink-0 sticky left-0 z-10 border-r flex flex-col justify-center gap-1 px-3"
                    style={{ width: LEFT_W, background: "hsl(var(--muted)/0.45)" }}
                  >
                    {/* Name row */}
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => toggleGroup(group.key)}
                        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                        title={isCollapsed ? "Expandir" : "Recolher"}
                      >
                        {isCollapsed
                          ? <ChevronRight className="h-3.5 w-3.5" />
                          : <ChevronDown  className="h-3.5 w-3.5" />}
                      </button>
                      <span
                        className="h-5 w-5 shrink-0 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                        style={{ background: "#64748b" }}
                      >
                        {initials(group.assigneeName)}
                      </span>
                      <span className="text-[11px] font-bold text-foreground/80 truncate">
                        {group.assigneeName}
                      </span>
                      <span className="ml-auto shrink-0 text-[10px] text-muted-foreground font-medium">
                        {group.demands.length} dem.
                      </span>
                    </div>
                    {/* Status breakdown */}
                    <div className="flex items-center gap-2 pl-[52px]">
                      {statusSummary.map(({ status, count }) => (
                        <span key={status} className="flex items-center gap-0.5">
                          <span
                            className="h-1.5 w-1.5 rounded-full shrink-0"
                            style={{ background: STATUS_CFG[status]?.color ?? "#94a3b8" }}
                          />
                          <span
                            className="text-[9px] font-semibold leading-none"
                            style={{ color: STATUS_CFG[status]?.color ?? "#94a3b8" }}
                          >
                            {count}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Right — grid lines */}
                  <div className="relative flex-1 overflow-hidden" style={{ width: TW }}>
                    <MonthLines />
                    <TodayLine />
                  </div>
                </div>

                {/* Demands in this group */}
                {!isCollapsed && group.demands.map((d, i) => {
                  const cfg      = STATUS_CFG[d.status] ?? STATUS_CFG.RASCUNHO;
                  const hasDates = !!d.plannedDeliveryDate;
                  const end      = hasDates ? dayStart(new Date(d.plannedDeliveryDate!)) : null;
                  const start    = d.plannedStartDate
                    ? dayStart(new Date(d.plannedStartDate))
                    : end ? addDays(end, -7) : null;
                  const barLeft  = start ? Math.max(0, dateToX(start)) : 0;
                  const barWidth = start && end
                    ? Math.max(8, dateToX(end) - dateToX(start) + getDayWidth(end))
                    : 0;
                  const isOverdue = end && !DONE_STATUSES.has(d.status) && today > end;
                  const isDone    = d.status === "HOMOLOGADA_PRODUCAO" || d.status === "CONCLUIDA";
                  const stripe    = i % 2 !== 0;

                  return (
                    <div
                      key={d.id}
                      className="flex border-b"
                      style={{ height: ROW_H, background: stripe ? "rgba(0,0,0,0.018)" : undefined }}
                    >
                      {/* Left info — sticky */}
                      <div
                        className="shrink-0 sticky left-0 z-10 bg-background border-r flex flex-col justify-center gap-0.5 px-3"
                        style={{ width: LEFT_W, background: stripe ? "hsl(var(--muted)/0.10)" : undefined }}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: cfg.color }} />
                          <Link
                            href={`/demandas/${d.id}`}
                            className="text-xs font-semibold truncate hover:underline leading-snug"
                            title={d.title}
                          >
                            {d.title}
                          </Link>
                        </div>
                        <div className="pl-3.5 text-[10px] text-muted-foreground">
                          {hasDates && start && end ? (
                            <span>{fmt(start)} → {fmt(end)}</span>
                          ) : (
                            <span className="italic opacity-60">sem data prevista</span>
                          )}
                        </div>
                      </div>

                      {/* Timeline */}
                      <div className="relative overflow-hidden" style={{ width: TW, height: ROW_H }}>
                        <MonthLines />
                        <TodayLine />
                        {hasDates && start && end && (
                          <div
                            className="absolute flex items-center overflow-hidden px-1.5 text-[10px] font-semibold text-white rounded"
                            style={{
                              left:   barLeft,
                              width:  barWidth,
                              top:    (ROW_H - 26) / 2,
                              height: 26,
                              background: cfg.color,
                              opacity: DONE_STATUSES.has(d.status) && !isDone ? 0.45 : 1,
                              boxShadow: isOverdue
                                ? "0 0 0 2px #ef4444"
                                : isDone
                                ? `0 0 0 1.5px ${cfg.color}88`
                                : undefined,
                            }}
                            title={`${d.title}\n${cfg.label}${isOverdue ? "\n⚠️ Atrasada" : ""}${isDone ? "\n✅ Concluída" : ""}`}
                          >
                            {barWidth > 72 && (d.assignee?.name?.split(" ")[0] ?? "")}
                            {isDone && barWidth > 44 && " ✓"}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

        </div>
      </div>
    </div>
  );
}
