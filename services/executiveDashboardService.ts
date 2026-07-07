import type { WorkerProfile } from "@prisma/client";
import {
  getExecDashboardDemands,
  getExecIncomingDemands,
  getExecStatusCounts,
  type ExecRawDemand,
} from "@/repositories/executiveDashboardRepository";
import { calculateBenchmarkEconomy } from "@/lib/benchmark/calculateBenchmarkEconomy";
import type { ExecutiveDashboardFilters } from "@/validations/executive-dashboard";

const SEM_SENIORIDADE       = "Sem senioridade";
const SEM_ESPECIALIDADE_LBL = "Sem especialidade";

// ── Tipos exportados ──────────────────────────────────────────────

export type ExecSummary = {
  totalDemands:              number;
  totalHours:                number;
  totalEstimatedValue:       number;
  totalBenchmarkValue:       number;
  totalEconomy:              number;
  economyPercent:            number;
  averageTicket:             number;
  averageHourlyCost:         number;
  averageHoursPerDemand:     number;
  activeCollaborators:       number;
  avgDemandsPerCollaborator: number;
  topArea:                   string | null;
  topCollaboratorName:       string | null;
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
  collaboratorId:    string;
  collaboratorName:  string;
  email:             string | null;
  profile:           string | null;
  seniority:         string | null;
  specialty:         string | null;
  demands:           number;
  hours:             number;
  value:             number;
  benchmarkValue:    number;
  economy:           number;
  topArea:           string | null;
  averageTicket:     number;
  averageHourlyCost: number;
  activeMonths:      number;
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
  directorId:     string | null;
  directorName:   string;
  demands:        number;
  hours:          number;
  value:          number;
  benchmarkValue: number;
  economy:        number;
  areas:          number;
  collaborators:  number;
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
  assigneeEmail:        string | null;
  assigneeProfile:      string | null;
  assigneeSpecialty:    string | null;
  directorId:           string | null;
  directorName:         string | null;
  homologationDate:     string | null;
  monthLabel:           string | null;
};

export type ExecSeniorityPoint = {
  seniority:                   string;
  collaborators:               number;
  demands:                     number;
  hours:                       number;
  estimatedValue:              number;
  benchmarkValue:              number;
  economy:                     number;
  averageTicket:               number;
  averageHourlyCost:           number;
  productivityPerCollaborator: number;
};

export type ExecSpecialtyPoint = {
  specialty:                   string;
  collaborators:               number;
  demands:                     number;
  hours:                       number;
  estimatedValue:              number;
  benchmarkValue:              number;
  economy:                     number;
  averageTicket:               number;
  averageHourlyCost:           number;
  productivityPerCollaborator: number;
};

export type ExecMonthSeniorityPoint = {
  yearMonth:      string;
  monthLabel:     string;
  seniority:      string;
  demands:        number;
  hours:          number;
  estimatedValue: number;
  benchmarkValue: number;
  economy:        number;
};

export type ExecMonthSpecialtyPoint = {
  yearMonth:      string;
  monthLabel:     string;
  specialty:      string;
  demands:        number;
  hours:          number;
  estimatedValue: number;
  benchmarkValue: number;
  economy:        number;
};

export type CollaboratorMonthCell = {
  yearMonth:      string;
  monthLabel:     string;
  demands:        number;
  hours:          number;
  estimatedValue: number;
};

export type ExecStatusCount = {
  status: string;
  label:  string;
  count:  number;
  color:  string;
};

export type ExecIncomingVsHomologated = {
  yearMonth:   string;
  monthLabel:  string;
  incoming:    number;
  homologated: number;
};

export type ExecDeadlineStats = {
  onTime:     number;
  late:       number;
  noDeadline: number;
  total:      number;
  onTimePct:  number;
  latePct:    number;
};

export type CollaboratorMonthRow = {
  collaboratorId:   string;
  collaboratorName: string;
  seniority:        string | null;
  specialty:        string | null;
  months:           CollaboratorMonthCell[];
  totalDemands:     number;
  totalHours:       number;
  totalValue:       number;
};

export type ExecDashboardData = {
  summary:                 ExecSummary;
  monthlySeries:           ExecMonthlyPoint[];
  byCollaborator:          ExecCollabPoint[];
  byArea:                  ExecAreaPoint[];
  byDirector:              ExecDirectorPoint[];
  complexityRoiMatrix:     ExecMatrixCell[];
  rankingCollaborators:    ExecCollabPoint[];
  rankingAreas:            ExecAreaPoint[];
  rankingDirectors:        ExecDirectorPoint[];
  demands:                 ExecDemandRow[];
  bySeniority:             ExecSeniorityPoint[];
  bySpecialty:             ExecSpecialtyPoint[];
  byMonthAndSeniority:     ExecMonthSeniorityPoint[];
  byMonthAndSpecialty:     ExecMonthSpecialtyPoint[];
  collaboratorMonthMatrix:  CollaboratorMonthRow[];
  allMonths:                { yearMonth: string; monthLabel: string }[];
  incomingVsHomologated:    ExecIncomingVsHomologated[];
  deadlineStats:            ExecDeadlineStats;
  byStatus:                 ExecStatusCount[];
};

// ── Helpers internos ──────────────────────────────────────────────

type EnrichedDemand = ExecRawDemand & {
  benchmarkValue:       number;
  economy:              number;
  economyPercent:       number;
  resolvedDirectorId:   string | null;
  resolvedDirectorName: string;
  resolvedSeniority:    string;
  resolvedSpecialty:    string;
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

  const rawSen = d.assigneeProfileSnapshot ?? d.assignee?.workerProfile ?? null;
  const resolvedSeniority = rawSen ? String(rawSen) : SEM_SENIORIDADE;
  const resolvedSpecialty = d.assignee?.technicalSpecialty ?? SEM_ESPECIALIDADE_LBL;

  return {
    ...d,
    benchmarkValue,
    economy,
    economyPercent,
    resolvedDirectorId,
    resolvedDirectorName,
    resolvedSeniority,
    resolvedSpecialty,
  };
}

function getMonthInfo(date: Date): { yearMonth: string; label: string } {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  return {
    yearMonth: `${y}-${String(m).padStart(2, "0")}`,
    label: date.toLocaleString("pt-BR", { month: "short", year: "2-digit" }),
  };
}

function topByKey<T extends Record<string, unknown>>(
  map: Map<string, T>,
  key: keyof T,
): string | null {
  let top: [string, T] | null = null;
  for (const entry of map.entries()) {
    if (!top || (entry[1][key] as number) > (top[1][key] as number)) top = entry;
  }
  return top ? top[0] : null;
}

// ── Computação ────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string }> = {
  RASCUNHO:               { label: "Rascunho",               color: "#94A3B8" },
  ABERTA:                 { label: "Aberta",                 color: "#64748B" },
  EM_ANALISE:             { label: "Em Análise",             color: "#007EB5" },
  PRIORIZACAO_DIRETORIA:  { label: "Prio. Diretoria",        color: "#7C3AED" },
  APROVADA:               { label: "Aprovada",               color: "#3F8298" },
  EM_DESENVOLVIMENTO:     { label: "Em Desenvolvimento",     color: "#F59E0B" },
  AGUARDANDO_HOMOLOGACAO: { label: "Ag. Homologação",        color: "#0F766E" },
  HOMOLOGADA_PRODUCAO:    { label: "Homologada",             color: "#16A34A" },
  REPROVADA:              { label: "Reprovada",              color: "#E11D48" },
  CANCELADA:              { label: "Cancelada",              color: "#DC2626" },
  CONCLUIDA:              { label: "Concluída",              color: "#15803D" },
};

const STATUS_ORDER = [
  "RASCUNHO", "ABERTA", "EM_ANALISE", "PRIORIZACAO_DIRETORIA",
  "APROVADA", "EM_DESENVOLVIMENTO", "AGUARDANDO_HOMOLOGACAO",
  "HOMOLOGADA_PRODUCAO", "CONCLUIDA", "REPROVADA", "CANCELADA",
];

function compute(
  demands:     EnrichedDemand[],
  incomingRaw: { yearMonth: string; count: number }[],
  statusRaw:   { status: string; count: number }[],
): ExecDashboardData {
  const collabMap          = new Map<string, ExecCollabPoint>();
  const collabAreaMap      = new Map<string, Map<string, number>>();
  const collabMonthSetMap  = new Map<string, Set<string>>();
  const collabMonthDataMap = new Map<string, Map<string, CollaboratorMonthCell>>();

  const areaMap        = new Map<string, ExecAreaPoint>();
  const areaCollabSet  = new Map<string, Set<string>>();

  const dirMap         = new Map<string, ExecDirectorPoint>();
  const dirAreaSet     = new Map<string, Set<string>>();
  const dirCollabSet   = new Map<string, Set<string>>();

  const monthlySeriesMap   = new Map<string, ExecMonthlyPoint>();
  const complexityRoiMap   = new Map<string, ExecMatrixCell>();
  const allMonthsMap       = new Map<string, string>();

  const seniorityMap       = new Map<string, ExecSeniorityPoint>();
  const seniorityCollabSet = new Map<string, Set<string>>();
  const specialtyMap       = new Map<string, ExecSpecialtyPoint>();
  const specialtyCollabSet = new Map<string, Set<string>>();
  const monthSeniorityMap  = new Map<string, ExecMonthSeniorityPoint>();
  const monthSpecialtyMap  = new Map<string, ExecMonthSpecialtyPoint>();

  let totalDemands        = 0;
  let totalHours          = 0;
  let totalEstimatedValue = 0;
  let totalBenchmarkValue = 0;
  let totalEconomy        = 0;

  for (const d of demands) {
    totalDemands++;
    const hrs = d.estimatedHours       ?? 0;
    const val = d.estimatedDemandValue ?? 0;
    totalHours          += hrs;
    totalEstimatedValue += val;
    totalBenchmarkValue += d.benchmarkValue;
    totalEconomy        += d.economy;

    const seniority = d.resolvedSeniority;
    const specialty = d.resolvedSpecialty;

    // ── Meses globais + série mensal + mês×senioridade + mês×especialidade ──
    if (d.homologationDate) {
      const { yearMonth, label } = getMonthInfo(d.homologationDate);
      allMonthsMap.set(yearMonth, label);

      if (!monthlySeriesMap.has(yearMonth)) {
        monthlySeriesMap.set(yearMonth, { yearMonth, label, demands: 0, hours: 0, value: 0, benchmarkValue: 0, economy: 0 });
      }
      const ms = monthlySeriesMap.get(yearMonth)!;
      ms.demands++;  ms.hours += hrs;  ms.value += val;
      ms.benchmarkValue += d.benchmarkValue;  ms.economy += d.economy;

      const msk = `${yearMonth}__${seniority}`;
      if (!monthSeniorityMap.has(msk)) {
        monthSeniorityMap.set(msk, { yearMonth, monthLabel: label, seniority, demands: 0, hours: 0, estimatedValue: 0, benchmarkValue: 0, economy: 0 });
      }
      const msen = monthSeniorityMap.get(msk)!;
      msen.demands++;  msen.hours += hrs;  msen.estimatedValue += val;
      msen.benchmarkValue += d.benchmarkValue;  msen.economy += d.economy;

      const mspk = `${yearMonth}__${specialty}`;
      if (!monthSpecialtyMap.has(mspk)) {
        monthSpecialtyMap.set(mspk, { yearMonth, monthLabel: label, specialty, demands: 0, hours: 0, estimatedValue: 0, benchmarkValue: 0, economy: 0 });
      }
      const mspe = monthSpecialtyMap.get(mspk)!;
      mspe.demands++;  mspe.hours += hrs;  mspe.estimatedValue += val;
      mspe.benchmarkValue += d.benchmarkValue;  mspe.economy += d.economy;
    }

    // ── Complexity × ROI ──
    if (d.complexity && d.roi) {
      const cmk = `${d.complexity}__${d.roi}`;
      if (!complexityRoiMap.has(cmk)) {
        complexityRoiMap.set(cmk, { complexity: d.complexity, roi: d.roi, demands: 0, value: 0 });
      }
      const cell = complexityRoiMap.get(cmk)!;
      cell.demands++;  cell.value += val;
    }

    // ── Área ──
    const area = d.requesterArea;
    if (!areaMap.has(area)) {
      areaMap.set(area, { area, demands: 0, hours: 0, value: 0, benchmarkValue: 0, economy: 0, collaborators: 0, averageTicket: 0 });
      areaCollabSet.set(area, new Set());
    }
    const ar = areaMap.get(area)!;
    ar.demands++;  ar.hours += hrs;  ar.value += val;
    ar.benchmarkValue += d.benchmarkValue;  ar.economy += d.economy;
    if (d.assigneeId) areaCollabSet.get(area)!.add(d.assigneeId);

    // ── Diretor ──
    const dirKey = d.resolvedDirectorId ?? "__SEM__";
    if (!dirMap.has(dirKey)) {
      dirMap.set(dirKey, { directorId: d.resolvedDirectorId, directorName: d.resolvedDirectorName, demands: 0, hours: 0, value: 0, benchmarkValue: 0, economy: 0, areas: 0, collaborators: 0 });
      dirAreaSet.set(dirKey,  new Set());
      dirCollabSet.set(dirKey, new Set());
    }
    const dir = dirMap.get(dirKey)!;
    dir.demands++;  dir.hours += hrs;  dir.value += val;
    dir.benchmarkValue += d.benchmarkValue;  dir.economy += d.economy;
    dirAreaSet.get(dirKey)!.add(area);
    if (d.assigneeId) dirCollabSet.get(dirKey)!.add(d.assigneeId);

    // ── Colaborador ──
    if (d.assigneeId && d.assignee) {
      const cid = d.assigneeId;
      if (!collabMap.has(cid)) {
        collabMap.set(cid, {
          collaboratorId:    cid,
          collaboratorName:  d.assignee.name,
          email:             d.assignee.email,
          profile:           d.assigneeProfileSnapshot ?? null,
          seniority:         d.assignee.workerProfile ? String(d.assignee.workerProfile) : null,
          specialty:         d.assignee.technicalSpecialty,
          demands: 0, hours: 0, value: 0, benchmarkValue: 0, economy: 0,
          topArea: null, averageTicket: 0, averageHourlyCost: 0, activeMonths: 0,
        });
        collabAreaMap.set(cid,      new Map());
        collabMonthSetMap.set(cid,  new Set());
        collabMonthDataMap.set(cid, new Map());
      }
      const col = collabMap.get(cid)!;
      col.demands++;  col.hours += hrs;  col.value += val;
      col.benchmarkValue += d.benchmarkValue;  col.economy += d.economy;

      const ca = collabAreaMap.get(cid)!;
      ca.set(area, (ca.get(area) ?? 0) + 1);

      if (d.homologationDate) {
        const { yearMonth, label } = getMonthInfo(d.homologationDate);
        collabMonthSetMap.get(cid)!.add(yearMonth);
        const cmm = collabMonthDataMap.get(cid)!;
        if (!cmm.has(yearMonth)) {
          cmm.set(yearMonth, { yearMonth, monthLabel: label, demands: 0, hours: 0, estimatedValue: 0 });
        }
        const mc = cmm.get(yearMonth)!;
        mc.demands++;  mc.hours += hrs;  mc.estimatedValue += val;
      }
    }

    // ── Senioridade ──
    if (!seniorityMap.has(seniority)) {
      seniorityMap.set(seniority, { seniority, collaborators: 0, demands: 0, hours: 0, estimatedValue: 0, benchmarkValue: 0, economy: 0, averageTicket: 0, averageHourlyCost: 0, productivityPerCollaborator: 0 });
      seniorityCollabSet.set(seniority, new Set());
    }
    const sen = seniorityMap.get(seniority)!;
    sen.demands++;  sen.hours += hrs;  sen.estimatedValue += val;
    sen.benchmarkValue += d.benchmarkValue;  sen.economy += d.economy;
    if (d.assigneeId) seniorityCollabSet.get(seniority)!.add(d.assigneeId);

    // ── Especialidade ──
    if (!specialtyMap.has(specialty)) {
      specialtyMap.set(specialty, { specialty, collaborators: 0, demands: 0, hours: 0, estimatedValue: 0, benchmarkValue: 0, economy: 0, averageTicket: 0, averageHourlyCost: 0, productivityPerCollaborator: 0 });
      specialtyCollabSet.set(specialty, new Set());
    }
    const spe = specialtyMap.get(specialty)!;
    spe.demands++;  spe.hours += hrs;  spe.estimatedValue += val;
    spe.benchmarkValue += d.benchmarkValue;  spe.economy += d.economy;
    if (d.assigneeId) specialtyCollabSet.get(specialty)!.add(d.assigneeId);
  }

  // ── Finalizar colaboradores ───────────────────────────────────────
  const byCollaborator = [...collabMap.values()].map((c) => {
    const ca       = collabAreaMap.get(c.collaboratorId)!;
    const topEntry = [...ca.entries()].sort((a, b) => b[1] - a[1])[0];
    c.topArea          = topEntry ? topEntry[0] : null;
    c.averageTicket    = c.demands > 0 ? c.value / c.demands : 0;
    c.averageHourlyCost = c.hours > 0 ? c.value / c.hours : 0;
    c.activeMonths     = collabMonthSetMap.get(c.collaboratorId)?.size ?? 0;
    return c;
  });

  const activeCollaborators       = byCollaborator.length;
  const avgDemandsPerCollaborator = activeCollaborators > 0 ? totalDemands / activeCollaborators : 0;
  const economyPercent            = totalBenchmarkValue > 0 ? totalEconomy / totalBenchmarkValue : 0;
  const averageTicket             = totalDemands > 0 ? totalEstimatedValue / totalDemands : 0;
  const averageHourlyCost         = totalHours > 0 ? totalEstimatedValue / totalHours : 0;
  const averageHoursPerDemand     = totalDemands > 0 ? totalHours / totalDemands : 0;

  // ── Finalizar áreas ───────────────────────────────────────────────
  const byArea = [...areaMap.values()].map((a) => {
    a.collaborators = areaCollabSet.get(a.area)!.size;
    a.averageTicket = a.demands > 0 ? a.value / a.demands : 0;
    return a;
  });

  // ── Finalizar diretores ───────────────────────────────────────────
  const byDirector = [...dirMap.values()].map((dir) => {
    dir.areas        = dirAreaSet.get(dir.directorId ?? "__SEM__")!.size;
    dir.collaborators = dirCollabSet.get(dir.directorId ?? "__SEM__")!.size;
    return dir;
  });

  // ── Finalizar senioridade ─────────────────────────────────────────
  const bySeniority = [...seniorityMap.values()].map((s) => {
    s.collaborators               = seniorityCollabSet.get(s.seniority)?.size ?? 0;
    s.averageTicket               = s.demands > 0 ? s.estimatedValue / s.demands : 0;
    s.averageHourlyCost           = s.hours > 0 ? s.estimatedValue / s.hours : 0;
    s.productivityPerCollaborator = s.collaborators > 0 ? s.demands / s.collaborators : 0;
    return s;
  }).sort((a, b) => b.estimatedValue - a.estimatedValue);

  // ── Finalizar especialidade ───────────────────────────────────────
  const bySpecialty = [...specialtyMap.values()].map((s) => {
    s.collaborators               = specialtyCollabSet.get(s.specialty)?.size ?? 0;
    s.averageTicket               = s.demands > 0 ? s.estimatedValue / s.demands : 0;
    s.averageHourlyCost           = s.hours > 0 ? s.estimatedValue / s.hours : 0;
    s.productivityPerCollaborator = s.collaborators > 0 ? s.demands / s.collaborators : 0;
    return s;
  }).sort((a, b) => b.estimatedValue - a.estimatedValue);

  // ── Todos os meses do período ─────────────────────────────────────
  const allMonths = [...allMonthsMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ym, lbl]) => ({ yearMonth: ym, monthLabel: lbl }));

  // ── Matriz colaborador × mês (top 30 por valor) ───────────────────
  const collaboratorMonthMatrix: CollaboratorMonthRow[] = [...byCollaborator]
    .sort((a, b) => b.value - a.value)
    .slice(0, 30)
    .map((c) => {
      const mmMap = collabMonthDataMap.get(c.collaboratorId) ?? new Map();
      const months = allMonths.map(({ yearMonth, monthLabel: ml }) =>
        mmMap.get(yearMonth) ?? { yearMonth, monthLabel: ml, demands: 0, hours: 0, estimatedValue: 0 }
      );
      return {
        collaboratorId:   c.collaboratorId,
        collaboratorName: c.collaboratorName,
        seniority:        c.seniority,
        specialty:        c.specialty,
        months,
        totalDemands:     c.demands,
        totalHours:       c.hours,
        totalValue:       c.value,
      };
    });

  // ── Top área / colaborador ────────────────────────────────────────
  const topAreaKey         = topByKey(areaMap as unknown as Map<string, Record<string, unknown>>, "demands");
  const topCollabKey       = topByKey(collabMap as unknown as Map<string, Record<string, unknown>>, "value");
  const topCollaboratorName = topCollabKey ? collabMap.get(topCollabKey)?.collaboratorName ?? null : null;

  const summary: ExecSummary = {
    totalDemands, totalHours, totalEstimatedValue, totalBenchmarkValue,
    totalEconomy, economyPercent, averageTicket, averageHourlyCost,
    averageHoursPerDemand, activeCollaborators, avgDemandsPerCollaborator,
    topArea: topAreaKey ?? null, topCollaboratorName,
  };

  // ── Lista de demandas ─────────────────────────────────────────────
  const demandRows: ExecDemandRow[] = demands.slice(0, 500).map((d) => {
    const ml = d.homologationDate ? getMonthInfo(d.homologationDate).label : null;
    return {
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
      assigneeName:         d.assignee?.name             ?? null,
      assigneeEmail:        d.assignee?.email            ?? null,
      assigneeProfile:      d.assigneeProfileSnapshot,
      assigneeSpecialty:    d.assignee?.technicalSpecialty ?? null,
      directorId:           d.resolvedDirectorId,
      directorName:         d.resolvedDirectorName,
      homologationDate:     d.homologationDate ? d.homologationDate.toISOString() : null,
      monthLabel:           ml,
    };
  });

  // ── Status do Kanban ─────────────────────────────────────────────
  const statusMap = new Map(statusRaw.map((r) => [r.status, r.count]));
  const byStatus: ExecStatusCount[] = STATUS_ORDER
    .filter((s) => statusMap.has(s))
    .map((s) => ({
      status: s,
      label:  STATUS_META[s]?.label ?? s,
      count:  statusMap.get(s) ?? 0,
      color:  STATUS_META[s]?.color ?? "#94A3B8",
    }));

  // ── Prazo (dentro / fora) ─────────────────────────────────────────
  let onTime = 0; let late = 0; let noDeadline = 0;
  for (const d of demands) {
    if (!d.plannedDeliveryDate || !d.homologationDate) { noDeadline++; continue; }
    if (d.homologationDate <= d.plannedDeliveryDate) onTime++; else late++;
  }
  const deadlineTotal = onTime + late;
  const deadlineStats: ExecDeadlineStats = {
    onTime, late, noDeadline,
    total:     deadlineTotal,
    onTimePct: deadlineTotal > 0 ? onTime / deadlineTotal : 0,
    latePct:   deadlineTotal > 0 ? late  / deadlineTotal : 0,
  };

  // ── Entrantes × Homologadas por mês ──────────────────────────────
  const incomingMap = new Map<string, number>(incomingRaw.map((r) => [r.yearMonth, r.count]));
  const allYearMonths = new Set([
    ...allMonthsMap.keys(),
    ...incomingRaw.map((r) => r.yearMonth),
  ]);
  const incomingVsHomologated: ExecIncomingVsHomologated[] = [...allYearMonths]
    .sort()
    .map((ym) => {
      const ms      = monthlySeriesMap.get(ym);
      const label   = ms?.label ?? allMonthsMap.get(ym) ?? ym;
      return {
        yearMonth:   ym,
        monthLabel:  label,
        incoming:    incomingMap.get(ym) ?? 0,
        homologated: ms?.demands ?? 0,
      };
    });

  return {
    summary,
    monthlySeries:        [...monthlySeriesMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v),
    byCollaborator,
    byArea,
    byDirector,
    complexityRoiMatrix:  [...complexityRoiMap.values()],
    rankingCollaborators: [...byCollaborator].sort((a, b) => b.value - a.value),
    rankingAreas:         [...byArea].sort((a, b) => b.value - a.value),
    rankingDirectors:     [...byDirector].sort((a, b) => b.value - a.value),
    demands:              demandRows,
    bySeniority,
    bySpecialty,
    byMonthAndSeniority:  [...monthSeniorityMap.values()].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth) || a.seniority.localeCompare(b.seniority)),
    byMonthAndSpecialty:  [...monthSpecialtyMap.values()].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth) || a.specialty.localeCompare(b.specialty)),
    collaboratorMonthMatrix,
    allMonths,
    incomingVsHomologated,
    deadlineStats,
    byStatus,
  };
}

// ── Service público ───────────────────────────────────────────────

export const executiveDashboardService = {
  async getData(filters: ExecutiveDashboardFilters): Promise<ExecDashboardData> {
    const [raw, incomingRaw, statusRaw] = await Promise.all([
      getExecDashboardDemands(filters),
      getExecIncomingDemands(filters.startDate, filters.endDate),
      getExecStatusCounts(filters.startDate, filters.endDate),
    ]);
    const enriched = raw.map(enrich);
    return compute(enriched, incomingRaw, statusRaw);
  },
};
