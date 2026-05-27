import { prisma } from "@/lib/prisma";
import type { CreateDemandInput, UpdateDemandInput } from "@/validations/demand";
import type { DemandFilters, DemandSummary, PaginatedResponse } from "@/types";
import type { Demand, User, DemandEvidence } from "@prisma/client";

type DemandWithRelations = Demand & {
  creator: User;
  assignee: User | null;
  evidences: DemandEvidence[];
};
import type { DemandStatus } from "@prisma/client";

const demandSummarySelect = {
  id: true,
  title: true,
  status: true,
  priority: true,
  demandType: true,
  createdAt: true,
  plannedDeliveryDate: true,
  assignee: { select: { id: true, name: true } },
  creator: { select: { id: true, name: true } },
} as const;

export const demandRepository = {
  async findById(id: string): Promise<DemandWithRelations | null> {
    return prisma.demand.findUnique({
      where: { id },
      include: {
        creator: true,
        assignee: true,
        evidences: { orderBy: { createdAt: "desc" } },
      },
    });
  },

  async findMany(filters: DemandFilters = {}): Promise<PaginatedResponse<DemandSummary>> {
    const { status, priority, demandType, assigneeId, creatorId, search, page = 1, pageSize = 20 } = filters;

    const where = {
      ...(status && { status }),
      ...(priority && { priority }),
      ...(demandType && { demandType }),
      ...(assigneeId && { assigneeId }),
      ...(creatorId && { creatorId }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
          { requesterName: { contains: search, mode: "insensitive" as const } },
        ],
      }),
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
      data: data as DemandSummary[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  async create(data: CreateDemandInput) {
    return prisma.demand.create({
      data,
      include: { creator: true, assignee: true },
    });
  },

  async update(id: string, data: UpdateDemandInput) {
    return prisma.demand.update({
      where: { id },
      data,
      include: { creator: true, assignee: true },
    });
  },

  async updateStatus(id: string, status: DemandStatus, extra?: Partial<{ actualDeliveryDate: Date; homologationDate: Date }>) {
    return prisma.demand.update({
      where: { id },
      data: { status, ...extra },
    });
  },

  async addEvidence(data: { demandId: string; title: string; url: string; description?: string }) {
    return prisma.demandEvidence.create({ data });
  },

  async findEvidences(demandId: string) {
    return prisma.demandEvidence.findMany({
      where: { demandId },
      orderBy: { createdAt: "desc" },
    });
  },
};
