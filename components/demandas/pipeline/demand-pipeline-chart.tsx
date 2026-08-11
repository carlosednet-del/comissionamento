"use client";

import { useMemo } from "react";
import Link from "next/link";

const DAY_PX  = 22;
const ROW_H   = 54;
const LEFT_W  = 284;
const HEADER_H = 48;

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  RASCUNHO:               { label: "Rascunho",       color: "#94a3b8" },
  ABERTA:                 { label: "Aberta",          color: "#3b82f6" },
  EM_ANALISE:             { label: "Em Análise",      color: "#6366f1" },
  PRIORIZACAO_DIRETORIA:  { label: "Diretoria",       color: "#a855f7" },
  APROVADA:               { label: "Aprovada",        color: "#06b6d4" },
  EM_DESENVOLVIMENTO:     { label: "Em Desenv.",      color: "#f59e0b" },
  AGUARDANDO_HOMOLOGACAO: { label: "Homologação",     color: "#f97316" },
  HOMOLOGADA_PRODUCAO:    { label: "Homologada",      color: "#22c55e" },
  CONCLUIDA:              { label: "Concluída",       color: "#10b981" },
  CANCELADA:              { label: "Cancelada",       color: "#94a3b8" },
  REPROVADA:              { label: "Reprovada",       color: "#ef4444" },
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

export function DemandPipelineChart({ demands }: { demands: PipelineDemand[] }) {
  const today = useMemo(() => dayStart(new Date()), []);

  const { rangeStart, totalDays, todayOff, months } = useMemo(() => {
    const pts: Date[] = [addDays(today, -21), addDays(today, 45)];
    for (const d of demands) {
      if (d.plannedStartDate)    pts.push(dayStart(new Date(d.plannedStartDate)));
      if (d.plannedDeliveryDate) pts.push(dayStart(new Date(d.plannedDeliveryDate)));
    }
    const rangeStart = monthStart(new Date(Math.min(...pts.map(x => x.getTime()))));
    const rawEnd     = new Date(Math.max(...pts.map(x => x.getTime())));
    const rangeEnd   = monthEnd(rawEnd);
    const totalDays  = diffDays(rangeStart, rangeEnd) + 1;
    const todayOff   = diffDays(rangeStart, today);

    const months: { label: string; off: number; days: number }[] = [];
    let cur = new Date(rangeStart);
    while (cur <= rangeEnd) {
      const ms = monthStart(cur);
      const me = monthEnd(cur);
      months.push({ label: fmtMonth(ms), off: diffDays(rangeStart, ms), days: diffDays(ms, me) + 1 });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
    return { rangeStart, totalDays, todayOff, months };
  }, [demands, today]);

  const TW = totalDays * DAY_PX;

  const withDates = demands.filter(d => d.plannedDeliveryDate);
  const noDate    = demands.filter(d => !d.plannedDeliveryDate);

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

          {/* Header */}
          <div className="flex sticky top-0 z-20 bg-background border-b">
            <div
              className="shrink-0 sticky left-0 z-30 bg-muted/20 border-r flex items-end px-3 pb-2"
              style={{ width: LEFT_W, height: HEADER_H }}
            >
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Demanda
              </span>
            </div>
            {/* Month columns */}
            <div className="flex" style={{ width: TW, height: HEADER_H }}>
              {months.map(m => (
                <div
                  key={m.label}
                  className="shrink-0 flex items-center justify-center border-r text-[11px] font-semibold text-muted-foreground bg-muted/10 relative"
                  style={{ width: m.days * DAY_PX }}
                >
                  {m.label}
                  {/* Today marker label */}
                  {todayOff >= m.off && todayOff < m.off + m.days && (
                    <span
                      className="absolute bottom-1 text-[9px] font-bold text-red-500"
                      style={{ left: (todayOff - m.off) * DAY_PX - 10 }}
                    >
                      hoje
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Rows with dates ──────────────────────────────────────── */}
          {withDates.map((d, i) => {
            const cfg      = STATUS_CFG[d.status] ?? STATUS_CFG.RASCUNHO;
            const end      = dayStart(new Date(d.plannedDeliveryDate!));
            const start    = d.plannedStartDate ? dayStart(new Date(d.plannedStartDate)) : addDays(end, -7);
            const barLeft  = Math.max(0, diffDays(rangeStart, start)) * DAY_PX;
            const barWidth = Math.max(DAY_PX, diffDays(start, end) * DAY_PX);
            const isOverdue = !DONE_STATUSES.has(d.status) && today > end;
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
                  style={{ width: LEFT_W, background: stripe ? "hsl(var(--muted)/0.15)" : undefined }}
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
                  <div className="flex items-center gap-2 pl-3.5 text-[10px] text-muted-foreground">
                    {d.assignee && (
                      <span className="truncate max-w-[130px]">{d.assignee.name}</span>
                    )}
                    <span className="shrink-0 opacity-80">
                      {d.plannedStartDate ? `${fmt(new Date(d.plannedStartDate))} → ` : "até "}
                      {fmt(end)}
                    </span>
                  </div>
                </div>

                {/* Timeline */}
                <div className="relative overflow-hidden" style={{ width: TW, height: ROW_H }}>
                  {/* Month separators */}
                  {months.map(m => (
                    <div
                      key={m.label}
                      className="absolute top-0 bottom-0 border-r border-muted/40"
                      style={{ left: (m.off + m.days) * DAY_PX - 1 }}
                    />
                  ))}
                  {/* Today line */}
                  {todayOff >= 0 && todayOff <= totalDays && (
                    <div
                      className="absolute top-0 bottom-0 z-10 pointer-events-none"
                      style={{ left: todayOff * DAY_PX, width: 2, background: "#ef4444", opacity: 0.6 }}
                    />
                  )}
                  {/* Planned bar */}
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
                </div>
              </div>
            );
          })}

          {/* ── Rows without dates ───────────────────────────────────── */}
          {noDate.length > 0 && (
            <>
              <div className="flex border-b bg-muted/30" style={{ minHeight: 28 }}>
                <div
                  className="sticky left-0 z-10 bg-muted/30 px-3 flex items-center border-r"
                  style={{ width: LEFT_W }}
                >
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Sem data prevista
                  </span>
                </div>
                <div style={{ width: TW }} />
              </div>
              {noDate.map((d, i) => {
                const cfg    = STATUS_CFG[d.status] ?? STATUS_CFG.RASCUNHO;
                const stripe = i % 2 !== 0;
                return (
                  <div
                    key={d.id}
                    className="flex border-b"
                    style={{ height: ROW_H, background: stripe ? "rgba(0,0,0,0.018)" : undefined }}
                  >
                    <div
                      className="shrink-0 sticky left-0 z-10 bg-background border-r flex flex-col justify-center gap-0.5 px-3"
                      style={{ width: LEFT_W }}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: cfg.color }} />
                        <Link
                          href={`/demandas/${d.id}`}
                          className="text-xs font-semibold truncate hover:underline"
                          title={d.title}
                        >
                          {d.title}
                        </Link>
                      </div>
                      {d.assignee && (
                        <p className="pl-3.5 text-[10px] text-muted-foreground truncate">
                          {d.assignee.name}
                        </p>
                      )}
                    </div>
                    <div
                      className="flex items-center px-4 text-[11px] text-muted-foreground italic"
                      style={{ width: TW }}
                    >
                      Sem data prevista de entrega
                    </div>
                  </div>
                );
              })}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
