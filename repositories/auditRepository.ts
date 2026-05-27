import { prisma } from "@/lib/prisma";
import type { AuditAction } from "@prisma/client";

export type CreateAuditInput = {
  entity: string;
  entityId: string;
  action: AuditAction;
  oldValue?: unknown;
  newValue?: unknown;
  userId: string;
};

export const auditRepository = {
  async create(data: CreateAuditInput) {
    return prisma.auditLog.create({
      data: {
        entity: data.entity,
        entityId: data.entityId,
        action: data.action,
        oldValue: data.oldValue ? JSON.parse(JSON.stringify(data.oldValue)) : undefined,
        newValue: data.newValue ? JSON.parse(JSON.stringify(data.newValue)) : undefined,
        userId: data.userId,
      },
    });
  },

  async findByEntity(entity: string, entityId: string) {
    return prisma.auditLog.findMany({
      where: { entity, entityId },
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

  async findByDemand(demandId: string) {
    return prisma.auditLog.findMany({
      where: { entity: "Demand", entityId: demandId },
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: "desc" },
    });
  },
};
