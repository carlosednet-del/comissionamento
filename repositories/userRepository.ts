import { prisma } from "@/lib/prisma";
import type { CreateUserInput, UpdateUserInput } from "@/validations/user";
import type { UserFilters } from "@/types";

export const userRepository = {
  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  async findByAuthUserId(authUserId: string) {
    return prisma.user.findUnique({ where: { authUserId } });
  },

  async findMany(filters: UserFilters = {}) {
    const { role, isActive, search } = filters;

    return prisma.user.findMany({
      where: {
        ...(role && { role }),
        ...(isActive !== undefined && { isActive }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }),
      },
      orderBy: { name: "asc" },
    });
  },

  async create(
    data: Omit<CreateUserInput, "password"> & { authUserId: string },
  ) {
    return prisma.user.create({
      data: {
        authUserId: data.authUserId,
        name: data.name,
        email: data.email,
        role: data.role,
        workerProfile: data.workerProfile ?? null,
        isActive: data.isActive ?? true,
      },
    });
  },

  async update(id: string, data: UpdateUserInput) {
    return prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        role: data.role,
        workerProfile: data.workerProfile ?? null,
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  },

  async activate(id: string) {
    return prisma.user.update({ where: { id }, data: { isActive: true } });
  },

  async deactivate(id: string) {
    return prisma.user.update({ where: { id }, data: { isActive: false } });
  },
};
