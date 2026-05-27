import { prisma } from "@/lib/prisma";
import type { DemandFilters, DemandSummary, PaginatedResponse } from "@/types";
import type { Demand, DemandStatus } from "@prisma/client";

// ── Projeção de lista ─────────────────────────────────────────────
const demandSummarySelect = {
  id:                  true,
  title:               true,
  status:              true,
  priority:            true,
  demandType:          true,
  requesterArea:       true,
  requesterName:       true,
  estimatedHours:      true,
  createdAt:           true,
  plannedDeliveryDate: true,
  assignee: { select: { id: true, name: true } },
  creator:  { select: { id: true, name: true } },
} as const;

// ── Projeção de detalhe ───────────────────────────────────────────
const demandDetailInclude = {
  creator:  { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true } },
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
      requesterArea,
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
      ...(requesterArea && {
        requesterArea: { contains: requesterArea, mode: "insensitive" as const },
      }),
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
    extra?: Partial<{
      actualDeliveryDate: Date;
      actualStartDate:    Date;
      homologationDate:   Date;
    }>,
  ): Promise<Demand> {
    return prisma.demand.update({
      where: { id },
      data: { status, ...extra },
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
