import { prisma } from "@/lib/prisma";
import type { DemandFilters, DemandSummary, PaginatedResponse } from "@/types";
import type { Demand, DemandStatus, DemandPriority, DemandType, ComplexityLevel, RoiLevel } from "@prisma/client";

// ── Tipo de filtros do Kanban ────────────────────────────────────
export type KanbanFilters = {
  search?:        string;
  statuses?:      DemandStatus[];
  priority?:      DemandPriority;
  demandType?:    DemandType;
  assigneeId?:     string;
  creatorId?:      string;
  requesterArea?:  string;
  requesterAreas?: string[];
  requesterName?:  string;
  complexity?:    ComplexityLevel;
  roi?:           RoiLevel;
  deadlineStatus?: "overdue" | "today" | "soon" | "ok";
  deliveryFrom?:  Date;
  deliveryTo?:    Date;
  onlyMine?:      boolean;
  currentUserId?: string;
  visibleStatuses?: DemandStatus[];
  sortBy?:        "priority" | "deadline" | "created" | "title";
};

// ── Projeção de lista ─────────────────────────────────────────────
const demandSummarySelect = {
  id:                      true,
  title:                   true,
  status:                  true,
  priority:                true,
  demandType:              true,
  requesterArea:           true,
  requesterName:           true,
  estimatedHours:          true,
  estimatedDemandValue:    true,
  complexity:              true,
  roi:                     true,
  createdAt:               true,
  plannedDeliveryDate:     true,
  directorPriorityOrder:   true,
  assigneeProfileSnapshot: true,
  hourlyRateSnapshot:      true,
  assignee: { select: { id: true, name: true } },
  creator:  { select: { id: true, name: true } },
} as const;

// ── Projeção de detalhe ───────────────────────────────────────────
const demandDetailInclude = {
  creator:       { select: { id: true, name: true } },
  assignee:      { select: { id: true, name: true } },
  approvedBy:    { select: { id: true, name: true } },
  homologatedBy: { select: { id: true, name: true } },
  canceledBy:    { select: { id: true, name: true } },
  prioritizedBy: { select: { id: true, name: true } },
  evidences: {
    orderBy: { createdAt: "desc" as const },
    include: { createdBy: { select: { id: true, name: true } } },
  },
};

export const demandRepository = {
  // ── Read ────────────────────────────────────────────────────────

  async findById(id: string) {
    return prisma.demand.findUnique({
      where: { id },
      include: demandDetailInclude,
    });
  },

  async findMany(filters: DemandFilters = {}): Promise<PaginatedResponse<DemandSummary>> {
    const {
      status,
      priority,
      demandType,
      assigneeId,
      creatorId,
      requesterArea,
      requesterAreas,
      search,
      createdFrom,
      createdTo,
      deliveryFrom,
      deliveryTo,
      page = 1,
      pageSize = 20,
    } = filters;

    const where = {
      ...(status        && { status }),
      ...(priority      && { priority }),
      ...(demandType    && { demandType }),
      ...(assigneeId    && { assigneeId }),
      ...(creatorId     && { creatorId }),
      ...(requesterArea
        ? { requesterArea: { contains: requesterArea, mode: "insensitive" as const } }
        : requesterAreas?.length
        ? { requesterArea: { in: requesterAreas } }
        : {}),
      ...(search && {
        OR: [
          { title:       { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
          { requesterName: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(createdFrom || createdTo
        ? {
            createdAt: {
              ...(createdFrom && { gte: createdFrom }),
              ...(createdTo   && { lte: createdTo   }),
            },
          }
        : {}),
      ...(deliveryFrom || deliveryTo
        ? {
            plannedDeliveryDate: {
              ...(deliveryFrom && { gte: deliveryFrom }),
              ...(deliveryTo   && { lte: deliveryTo   }),
            },
          }
        : {}),
    };

    const [data, total] = await prisma.$transaction([
      prisma.demand.findMany({
        where,
        select: demandSummarySelect,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.demand.count({ where }),
    ]);

    return {
      data: data as unknown as DemandSummary[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  async findKanbanDemands(filters: KanbanFilters): Promise<DemandSummary[]> {
    const {
      search,
      statuses,
      priority,
      demandType,
      assigneeId,
      creatorId,
      requesterArea,
      requesterAreas,
      requesterName,
      complexity,
      roi,
      deadlineStatus,
      deliveryFrom,
      deliveryTo,
      onlyMine,
      currentUserId,
      visibleStatuses,
      sortBy = "priority",
    } = filters;

    const today    = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const soonEnd  = new Date(today);
    soonEnd.setDate(soonEnd.getDate() + 4); // "soon" = next 3 days

    const deadlineWhere = (() => {
      if (!deadlineStatus) return undefined;
      switch (deadlineStatus) {
        case "overdue": return { plannedDeliveryDate: { lt: today } };
        case "today":   return { plannedDeliveryDate: { gte: today, lt: tomorrow } };
        case "soon":    return { plannedDeliveryDate: { gte: tomorrow, lt: soonEnd } };
        case "ok":      return { plannedDeliveryDate: { gte: soonEnd } };
      }
    })();

    const statusFilter = (() => {
      // merge role-visible statuses with user-selected filter
      const base = visibleStatuses && visibleStatuses.length > 0 ? visibleStatuses : undefined;
      if (base && statuses && statuses.length > 0) {
        const intersection = statuses.filter((s) => base.includes(s));
        return intersection.length > 0 ? intersection : base;
      }
      if (base)    return base;
      if (statuses && statuses.length > 0) return statuses;
      return undefined;
    })();

    const where = {
      ...(statusFilter   && { status: { in: statusFilter } }),
      ...(priority       && { priority }),
      ...(demandType     && { demandType }),
      ...(complexity     && { complexity }),
      ...(roi            && { roi }),
      ...(assigneeId     && { assigneeId }),
      ...(creatorId      && { creatorId  }),
      ...(onlyMine && currentUserId
        ? { OR: [{ assigneeId: currentUserId }, { creatorId: currentUserId }] }
        : {}),
      ...(requesterArea
        ? { requesterArea: { contains: requesterArea, mode: "insensitive" as const } }
        : requesterAreas?.length
        ? { requesterArea: { in: requesterAreas } }
        : {}),
      ...(requesterName  && {
        requesterName: { contains: requesterName, mode: "insensitive" as const },
      }),
      ...(search && {
        OR: [
          { title:         { contains: search, mode: "insensitive" as const } },
          { description:   { contains: search, mode: "insensitive" as const } },
          { requesterName: { contains: search, mode: "insensitive" as const } },
          { requesterArea: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(deadlineWhere ?? {}),
      ...(deliveryFrom || deliveryTo
        ? {
            plannedDeliveryDate: {
              ...(deliveryFrom && { gte: deliveryFrom }),
              ...(deliveryTo   && { lte: deliveryTo   }),
            },
          }
        : {}),
    };

    const orderBy = (() => {
      switch (sortBy) {
        case "deadline": return [{ plannedDeliveryDate: "asc" as const }];
        case "created":  return [{ createdAt: "desc" as const }];
        case "title":    return [{ title: "asc" as const }];
        case "priority":
        default:         return [{ priority: "desc" as const }, { createdAt: "desc" as const }];
      }
    })();

    const data = await prisma.demand.findMany({
      where,
      select: demandSummarySelect,
      orderBy,
      take: 500, // razoável para kanban sem paginação
    });

    return data as unknown as DemandSummary[];
  },

  async countByStatus() {
    const groups = await prisma.demand.groupBy({
      by: ["status"],
      _count: { _all: true },
    });
    return Object.fromEntries(
      groups.map((g) => [g.status, g._count._all]),
    ) as Partial<Record<DemandStatus, number>>;
  },

  // ── Write ───────────────────────────────────────────────────────

  async create(data: Omit<Parameters<typeof prisma.demand.create>[0]["data"], never>) {
    return prisma.demand.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: data as any,
      include: demandDetailInclude,
    });
  },

  async update(id: string, data: Parameters<typeof prisma.demand.update>[0]["data"]) {
    return prisma.demand.update({
      where: { id },
      data,
      include: demandDetailInclude,
    });
  },

  async updateStatus(
    id: string,
    status: DemandStatus,
    extra?: Record<string, unknown>,
  ): Promise<Demand> {
    return prisma.demand.update({
      where: { id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { status, ...(extra as any) },
    });
  },

  // ── Evidence ────────────────────────────────────────────────────

  async addEvidence(data: {
    demandId:    string;
    title:       string;
    url:         string;
    description?: string;
    createdById?: string | null;
  }) {
    return prisma.demandEvidence.create({
      data,
      include: { createdBy: { select: { id: true, name: true } } },
    });
  },

  async findEvidences(demandId: string) {
    return prisma.demandEvidence.findMany({
      where: { demandId },
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
  },
};
