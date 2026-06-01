import { userRepository } from "@/repositories/userRepository";
import { auditService } from "@/services/auditService";
import { authService } from "@/services/authService";
import { permissionService } from "@/services/permissionService";
import { createUserSchema, updateUserSchema, type CreateUserInput, type UpdateUserInput } from "@/validations/user";
import type { UserFilters } from "@/types";
import type { UserForPermission } from "@/server/auth/permissions";

export class UserNotFoundError extends Error {
  constructor(id: string) {
    super(`Usuário ${id} não encontrado`);
    this.name = "UserNotFoundError";
  }
}

export class EmailAlreadyExistsError extends Error {
  constructor(email: string) {
    super(`E-mail ${email} já está em uso`);
    this.name = "EmailAlreadyExistsError";
  }
}

export class SelfRoleChangeError extends Error {
  constructor() {
    super("Você não pode alterar o próprio papel");
    this.name = "SelfRoleChangeError";
  }
}

export const userService = {
  async getById(id: string) {
    const user = await userRepository.findById(id);
    if (!user) throw new UserNotFoundError(id);
    return user;
  },

  async listUsers(filters: UserFilters = {}) {
    return userRepository.findMany(filters);
  },

  async createUser(input: CreateUserInput, actor: UserForPermission) {
    permissionService.assertCanCreateUser(actor);

    const data = createUserSchema.parse(input);

    const existing = await userRepository.findByEmail(data.email);
    if (existing) throw new EmailAlreadyExistsError(data.email);

    // 1. Criar no Supabase Auth
    const authUser = await authService.createAuthUser({
      email: data.email,
      password: data.password,
      role: data.role,
      isActive: data.isActive ?? true,
    });

    // 2. Criar no banco com authUserId
    const user = await userRepository.create({
      authUserId:        authUser.id,
      name:              data.name,
      email:             data.email,
      role:              data.role,
      workerProfile:     data.workerProfile,
      monthlyBaseSalary: data.monthlyBaseSalary,
      monthlyCapValue:   data.monthlyCapValue,
      isActive:          data.isActive ?? true,
    });

    await auditService.log({
      entity: "User",
      entityId: user.id,
      action: "CREATE",
      newValue: { name: user.name, email: user.email, role: user.role },
      userId: actor.id,
    });

    return user;
  },

  async updateUser(id: string, input: UpdateUserInput, actor: UserForPermission) {
    const data = updateUserSchema.parse(input);

    const existing = await userRepository.findById(id);
    if (!existing) throw new UserNotFoundError(id);

    permissionService.assertCanEditUser(actor, {
      id: existing.id,
      role: existing.role,
      isActive: existing.isActive,
    });

    // ADMIN não pode alterar o próprio papel
    if (actor.id === id && data.role !== existing.role) throw new SelfRoleChangeError();

    const updated = await userRepository.update(id, data);

    // Sincronizar metadata no Supabase Auth se role ou isActive mudou
    if (
      existing.authUserId &&
      (data.role !== existing.role || data.isActive !== existing.isActive)
    ) {
      await authService.updateAuthUserMetadata(existing.authUserId, {
        ...(data.role !== existing.role && { role: data.role }),
        ...(data.isActive !== undefined && data.isActive !== existing.isActive && { isActive: data.isActive }),
      });
    }

    await auditService.log({
      entity: "User",
      entityId: id,
      action: "UPDATE",
      oldValue: { name: existing.name, role: existing.role, workerProfile: existing.workerProfile },
      newValue: { name: updated.name, role: updated.role, workerProfile: updated.workerProfile },
      userId: actor.id,
    });

    return updated;
  },

  async activateUser(id: string, actor: UserForPermission) {
    const existing = await userRepository.findById(id);
    if (!existing) throw new UserNotFoundError(id);

    permissionService.assertCanDeactivateUser(actor, {
      id: existing.id,
      role: existing.role,
      isActive: existing.isActive,
    });

    const updated = await userRepository.activate(id);

    if (existing.authUserId) {
      await authService.updateAuthUserMetadata(existing.authUserId, { isActive: true });
    }

    await auditService.log({
      entity: "User",
      entityId: id,
      action: "UPDATE",
      oldValue: { isActive: false },
      newValue: { isActive: true },
      userId: actor.id,
    });

    return updated;
  },

  async deactivateUser(id: string, actor: UserForPermission) {
    const existing = await userRepository.findById(id);
    if (!existing) throw new UserNotFoundError(id);

    permissionService.assertCanDeactivateUser(actor, {
      id: existing.id,
      role: existing.role,
      isActive: existing.isActive,
    });

    const updated = await userRepository.deactivate(id);

    if (existing.authUserId) {
      await authService.updateAuthUserMetadata(existing.authUserId, { isActive: false });
    }

    await auditService.log({
      entity: "User",
      entityId: id,
      action: "UPDATE",
      oldValue: { isActive: true },
      newValue: { isActive: false },
      userId: actor.id,
    });

    return updated;
  },
};
