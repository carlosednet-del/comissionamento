import { prisma } from "@/lib/prisma";
import type { ExecutiveDashboardFilters } from "@/validations/executive-dashboard";
import type { DemandStatus, WorkerProfile, DemandType, ComplexityLevel, RoiLevel } from "@prisma/client";
import { SEM_ESPECIALIDADE_FILTER } from "@/lib/constants/specialties";

const DEMAND_SELECT = {
  id:                      true,
  title:                   true,
  requesterArea:           true,
  demandType:              true,
  complexity:              true,
  roi:                     true,
  estimatedHours:          true,
  estimatedDemandValue:    true,
  assigneeId:              true,
  assigneeProfileSnapshot: true,
  hourlyRateSnapshot:      true,
  homologationDate:        true,
  directorId:              true,
  prioritizedById:         true,
  creatorId:               true,
  status:                  true,
  assignee: {
    select: {
      id:                 true,
      name:               true,
      email:              true,
      workerProfile:      true,
      role:               true,
      technicalSpecialty: true,
    },
  },
  director:      { select: { id: true, name: true } },
  prioritizedBy: { select: { id: true, name: true } },
} as const;

export type ExecRawDemand = {
  id:                      string;
  title:                   string;
  requesterArea:           string;
  demandType:              DemandType;
  complexity:              ComplexityLevel | null;
  roi:                     RoiLevel | null;
  estimatedHours:          number | null;
  estimatedDemandValue:    number | null;
  assigneeId:              string | null;
  assigneeProfileSnapshot: WorkerProfile | null;
  hourlyRateSnapshot:      number | null;
  homologationDate:        Date | null;
  directorId:              string | null;
  prioritizedById:         string | null;
  creatorId:               string;
  status:                  DemandStatus;
  assignee: {
    id:                 string;
    name:               string;
    email:              string;
    workerProfile:      WorkerProfile | null;
    role:               string;
    technicalSpecialty: string | null;
  } | null;
  director:      { id: string; name: string } | null;
  prioritizedBy: { id: string; name: string } | null;
};

export async function getExecDashboardDemands(
  filters: ExecutiveDashboardFilters,
): Promise<ExecRawDemand[]> {
  const where: Record<string, unknown> = {};

  if (filters.homologatedOnly !== false) {
    where.status = "HOMOLOGADA_PRODUCAO" as DemandStatus;
  }

  if (filters.startDate || filters.endDate) {
    const dateFilter: Record<string, Date> = {};
    if (filters.startDate) dateFilter.gte = new Date(filters.startDate);
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }
    where.homologationDate = dateFilter;
  }

  if (filters.collaboratorId) where.assigneeId           = filters.collaboratorId;
  if (filters.requesterArea)  where.requesterArea         = filters.requesterArea;
  if (filters.workerProfile)  where.assigneeProfileSnapshot = filters.workerProfile;
  if (filters.demandType)     where.demandType            = filters.demandType;
  if (filters.complexity)     where.complexity            = filters.complexity;
  if (filters.roi)            where.roi                   = filters.roi;

  if (filters.directorId === "SEM_DIRETOR") {
    where.directorId = null;
  } else if (filters.directorId) {
    where.directorId = filters.directorId;
  }

  // Filtro de especialidade (relação com assignee)
  if (filters.specialty === SEM_ESPECIALIDADE_FILTER) {
    where.assignee = { is: { technicalSpecialty: null } };
  } else if (filters.specialty) {
    where.assignee = { technicalSpecialty: filters.specialty };
  }

  return prisma.demand.findMany({
    where,
    select: DEMAND_SELECT,
    orderBy: { homologationDate: "desc" },
    take: 2000,
  }) as Promise<ExecRawDemand[]>;
}

export async function getExecDashboardDirectors() {
  return prisma.user.findMany({
    where: { role: { in: ["DIRETOR", "ADMIN"] }, isActive: true },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
}

export async function getExecDashboardCollaborators() {
  const rows = await prisma.demand.findMany({
    where: { status: "HOMOLOGADA_PRODUCAO", assigneeId: { not: null } },
    distinct: ["assigneeId"],
    select: {
      assignee: {
        select: {
          id:                 true,
          name:               true,
          workerProfile:      true,
          technicalSpecialty: true,
        },
      },
    },
    orderBy: { assignee: { name: "asc" } },
  });
  return rows
    .map((r) => r.assignee)
    .filter((a): a is NonNullable<typeof a> => a !== null);
}
