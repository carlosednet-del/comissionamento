import type { WorkerProfile } from "@prisma/client";
import {
  getExecDashboardDemands,
  type ExecRawDemand,
} from "@/repositories/executiveDashboardRepository";
import { calculateBenchmarkEconomy } from "@/lib/benchmark/calculateBenchmarkEconomy";
import type { ExecutiveDashboardFilters } from "@/validations/executive-dashboard";

// ── Tipos exportados ──────────────────────────────────────────────

export type ExecSummary = {
  totalDemands:                  number;
  totalHours:                    number;
  totalEstimatedValue:           number;
  totalBenchmarkValue:           number;
  totalEconomy:                  number;
  economyPercent:                number;
  averageTicket:                 number;
  averageHourlyCost:             number;
  averageHoursPerDemand:         number;
  activeCollaborators:           number;
  avgDemandsPerCollaborator:     number;
  topArea:                       string | null;
  topCollaboratorName:           string | null;
};

export type ExecMonthlyPoint = {
  yearMonth:      string;
  label:          string;
  demands:        number;
  hours:          number;
  value:          number;
  benchmarkValue: number;
  economy:        number;
};

export type ExecCollabPoint = {
  collaboratorId:   string;
  collaboratorName: string;
  profile:          string | null;
  demands:          number;
  hours:            number;
  value:            number;
  benchmarkValue:   number;
  economy:          number;
  topArea:          string | null;
  averageTicket:    number;
};

export type ExecAreaPoint = {
  area:           string;
  demands:        number;
  hours:          number;
  value:          number;
  benchmarkValue: number;
  economy:        number;
  collaborators:  number;
  averageTicket:  number;
};

export type ExecDirectorPoint = {
  directorId:    string | null;
  directorName:  string;
  demands:       number;
  hours:         number;
  value:         number;
  benchmarkValue:number;
  economy:       number;
  areas:         number;
  collaborators: number;
};

export type ExecMatrixCell = {
  complexity: string;
  roi:        string;
  demands:    number;
  value:      number;
};

export type ExecDemandRow = {
  id:                   string;
  title:                string;
  requesterArea:        string;
  demandType:           string;
  complexity:           string | null;
  roi:                  string | null;
  estimatedHours:       number;
  estimatedDemandValue: number;
  benchmarkValue:       number;
  economy:              number;
  economyPercent:       number;
  assigneeId:           string | null;
  assigneeName:         string | null;
  assigneeProfile:      string | null;
  directorId:           string | null;
  directorName:         string | null;
  homologationDate:     string | null;
};

export type ExecDashboardData = {
  summary:             ExecSummary;
  monthlySeries:       ExecMonthlyPoint[];
  byCollaborator:      ExecCollabPoint[];
  byArea:              ExecAreaPoint[];
  byDirector:          ExecDirectorPoint[];
  complexityRoiMatrix: ExecMatrixCell[];
  rankingCollaborators:ExecCollabPoint[];
  rankingAreas:        ExecAreaPoint[];
  rankingDirectors:    ExecDirectorPoint[];
  demands:             ExecDemandRow[];
};

// ── Helpers internos ──────────────────────────────────────────────

type EnrichedDemand = ExecRawDemand & {
  benchmarkValue: number;
  economy:        number;
  economyPercent: number;
  resolvedDirectorId:   string | null;
  resolvedDirectorName: string;
};

function enrich(d: ExecRawDemand): EnrichedDemand {
  const hours = d.estimatedHours ?? 0;
  const value = d.estimatedDemandValue ?? 0;

  let benchmarkValue = 0;
  let economy        = 0;
  let economyPercent = 0;

  if (hours > 0 && d.assigneeProfileSnapshot) {
    const b = calculateBenchmarkEconomy({
      estimatedHours: hours,
      workerProfile:  d.assigneeProfileSnapshot as WorkerProfile,
      ourHourlyRate:  d.hourlyRateSnapshot ?? undefined,
      ourValue:       value > 0 ? value : undefined,
    });
    benchmarkValue = b.marketBenchAdjusted;
    economy        = b.economy;
    economyPercent = b.economyPercent;
  }

  let resolvedDirectorId:   string | null = null;
  let resolvedDirectorName: string        = "Sem Diretor";

  if (d.directorId && d.director) {
    resolvedDirectorId   = d.directorId;
    resolvedDirectorName = d.director.name;
  } else if (d.prioritizedById && d.prioritizedBy) {
    resolvedDirectorId   = d.prioritizedById;
    resolvedDirectorName = d.prioritizedBy.name;
  }

  return { ...d, benchmarkValue, economy, economyPercent, resolvedDirectorId, resolvedDirectorName };
}

function monthLabel(date: Date): { yearMonth: string; label: string } {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const yearMonth = `${y}-${String(m).padStart(2, "0")}`;
  const label     = date.toLocaleString("pt-BR", { month: "short", year: "2-digit" });
  return { yearMonth, label };
}

function topEntry<T extends Record<string, unknown>>(
  map: Map<string, T>,
  key: keyof T,
): string | null {
  let top: [string, T] | null = null;
  for (const entry of map.entries()) {
    if (!top || (entry[1][key] as number) > (top[1][key] as number)) top = entry;
  }
  return top ? top[0] : null;
}

// ── Computação do dashboard ───────────────────────────────────────

function compute(demands: EnrichedDemand[]): ExecDashboardData {
  // Summary
  const totalDemands        = demands.length;
  const totalHours          = demands.reduce((s, d) => s + (d.estimatedHours ?? 0), 0);
  const totalEstimatedValue = demands.reduce((s, d) => s + (d.estimatedDemandValue ?? 0), 0);
  const totalBenchmarkValue = demands.reduce((s, d) => s + d.benchmarkValue, 0);
  const totalEconomy        = demands.reduce((s, d) => s + d.economy, 0);
  const economyPercent      = totalBenchmarkValue > 0 ? totalEconomy / totalBenchmarkValue : 0;
  const averageTicket       = totalDemands > 0 ? totalEstimatedValue / totalDemands : 0;
  const averageHourlyCost   = totalHours > 0 ? totalEstimatedValue / totalHours : 0;
  const averageHoursPerDemand = totalDemands > 0 ? totalHours / totalDemands : 0;

  // By collaborator
  const collabMap = new Map<string, ExecCollabPoint>();
  const areaCountMap = new Map<string, Map<string, number>>(); // collabId → area → count

  for (const d of demands) {
    if (!d.assigneeId || !d.assignee) continue;
    const id   = d.assigneeId;
    const name = d.assignee.name;

    if (!collabMap.has(id)) {
      collabMap.set(id, { collaboratorId: id, collaboratorName: name, profile: d.assigneeProfileSnapshot ?? null, demands: 0, hours: 0, value: 0, benchmarkValue: 0, economy: 0, topArea: null, averageTicket: 0 });
      areaCountMap.set(id, new Map());
    }
    const c = collabMap.get(id)!;
    c.demands++;
    c.hours         += d.estimatedHours       ?? 0;
    c.value         += d.estimatedDemandValue ?? 0;
    c.benchmarkValue += d.benchmarkValue;
    c.economy       += d.economy;

    const aMap = areaCountMap.get(id)!;
    aMap.set(d.requesterArea, (aMap.get(d.requesterArea) ?? 0) + 1);
  }

  const byCollaborator = [...collabMap.values()].map((c) => {
    const aMap = areaCountMap.get(c.collaboratorId)!;
    const topAreaEntry = [...aMap.entries()].sort((a, b) => b[1] - a[1])[0];
    c.topArea      = topAreaEntry ? topAreaEntry[0] : null;
    c.averageTicket = c.demands > 0 ? c.value / c.demands : 0;
    return c;
  });

  const activeCollaborators         = byCollaborator.length;
  const avgDemandsPerCollaborator   = activeCollaborators > 0 ? totalDemands / activeCollaborators : 0;

  // By area
  const areaMap = new Map<string, ExecAreaPoint>();
  const areaCollabSet = new Map<string, Set<string>>();

  for (const d of demands) {
    const area = d.requesterArea;
    if (!areaMap.has(area)) {
      areaMap.set(area, { area, demands: 0, hours: 0, value: 0, benchmarkValue: 0, economy: 0, collaborators: 0, averageTicket: 0 });
      areaCollabSet.set(area, new Set());
    }
    const a = areaMap.get(area)!;
    a.demands++;
    a.hours         += d.estimatedHours       ?? 0;
    a.value         += d.estimatedDemandValue ?? 0;
    a.benchmarkValue += d.benchmarkValue;
    a.economy       += d.economy;
    if (d.assigneeId) areaCollabSet.get(area)!.add(d.assigneeId);
  }

  const byArea = [...areaMap.values()].map((a) => {
    a.collaborators  = areaCollabSet.get(a.area)!.size;
    a.averageTicket  = a.demands > 0 ? a.value / a.demands : 0;
    return a;
  });

  // By director
  const dirMap      = new Map<string, ExecDirectorPoint>();
  const dirAreaSet  = new Map<string, Set<string>>();
  const dirCollabSet = new Map<string, Set<string>>();

  for (const d of demands) {
    const key  = d.resolvedDirectorId ?? "__SEM__";
    const name = d.resolvedDirectorName;

    if (!dirMap.has(key)) {
      dirMap.set(key, { directorId: d.resolvedDirectorId, directorName: name, demands: 0, hours: 0, value: 0, benchmarkValue: 0, economy: 0, areas: 0, collaborators: 0 });
      dirAreaSet.set(key,  new Set());
      dirCollabSet.set(key, new Set());
    }
    const dir = dirMap.get(key)!;
    dir.demands++;
    dir.hours         += d.estimatedHours       ?? 0;
    dir.value         += d.estimatedDemandValue ?? 0;
    dir.benchmarkValue += d.benchmarkValue;
    dir.economy       += d.economy;
    dirAreaSet.get(key)!.add(d.requesterArea);
    if (d.assigneeId) dirCollabSet.get(key)!.add(d.assigneeId);
  }

  const byDirector = [...dirMap.values()].map((dir) => {
    dir.areas        = dirAreaSet.get(dir.directorId ?? "__SEM__")!.size;
    dir.collaborators = dirCollabSet.get(dir.directorId ?? "__SEM__")!.size;
    return dir;
  });

  // Monthly series
  const monthMap = new Map<string, ExecMonthlyPoint>();

  for (const d of demands) {
    if (!d.homologationDate) continue;
    const { yearMonth, label } = monthLabel(d.homologationDate);
    if (!monthMap.has(yearMonth)) {
      monthMap.set(yearMonth, { yearMonth, label, demands: 0, hours: 0, value: 0, benchmarkValue: 0, economy: 0 });
    }
    const m = monthMap.get(yearMonth)!;
    m.demands++;
    m.hours         += d.estimatedHours       ?? 0;
    m.value         += d.estimatedDemandValue ?? 0;
    m.benchmarkValue += d.benchmarkValue;
    m.economy       += d.economy;
  }

  const monthlySeries = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);

  // Complexity × ROI matrix
  const matrixMap = new Map<string, ExecMatrixCell>();

  for (const d of demands) {
    if (!d.complexity || !d.roi) continue;
    const key = `${d.complexity}__${d.roi}`;
    if (!matrixMap.has(key)) {
      matrixMap.set(key, { complexity: d.complexity, roi: d.roi, demands: 0, value: 0 });
    }
    const cell = matrixMap.get(key)!;
    cell.demands++;
    cell.value += d.estimatedDemandValue ?? 0;
  }

  const complexityRoiMatrix = [...matrixMap.values()];

  // Top area
  const topAreaKey = topEntry(areaMap as unknown as Map<string, Record<string, unknown>>, "demands");
  const topArea    = topAreaKey ?? null;

  // Top collaborator
  const topCollabKey  = topEntry(collabMap as unknown as Map<string, Record<string, unknown>>, "value");
  const topCollabEntry = topCollabKey ? collabMap.get(topCollabKey) : null;
  const topCollaboratorName = topCollabEntry?.collaboratorName ?? null;

  const summary: ExecSummary = {
    totalDemands, totalHours, totalEstimatedValue, totalBenchmarkValue,
    totalEconomy, economyPercent, averageTicket, averageHourlyCost,
    averageHoursPerDemand, activeCollaborators, avgDemandsPerCollaborator,
    topArea, topCollaboratorName,
  };

  // Demands list
  const demandRows: ExecDemandRow[] = demands.slice(0, 500).map((d) => ({
    id:                   d.id,
    title:                d.title,
    requesterArea:        d.requesterArea,
    demandType:           d.demandType,
    complexity:           d.complexity,
    roi:                  d.roi,
    estimatedHours:       d.estimatedHours       ?? 0,
    estimatedDemandValue: d.estimatedDemandValue ?? 0,
    benchmarkValue:       d.benchmarkValue,
    economy:              d.economy,
    economyPercent:       d.economyPercent,
    assigneeId:           d.assigneeId,
    assigneeName:         d.assignee?.name ?? null,
    assigneeProfile:      d.assigneeProfileSnapshot,
    directorId:           d.resolvedDirectorId,
    directorName:         d.resolvedDirectorName,
    homologationDate:     d.homologationDate ? d.homologationDate.toISOString() : null,
  }));

  return {
    summary,
    monthlySeries,
    byCollaborator,
    byArea,
    byDirector,
    complexityRoiMatrix,
    rankingCollaborators: [...byCollaborator].sort((a, b) => b.value - a.value),
    rankingAreas:         [...byArea].sort((a, b) => b.value - a.value),
    rankingDirectors:     [...byDirector].sort((a, b) => b.value - a.value),
    demands:              demandRows,
  };
}

// ── Service público ───────────────────────────────────────────────

export const executiveDashboardService = {
  async getData(filters: ExecutiveDashboardFilters): Promise<ExecDashboardData> {
    const raw      = await getExecDashboardDemands(filters);
    const enriched = raw.map(enrich);
    return compute(enriched);
  },
};
