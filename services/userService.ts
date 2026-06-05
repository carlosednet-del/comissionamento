import { userRepository } from "@/repositories/userRepository";
import { auditService } from "@/services/auditService";
import { authService } from "@/services/authService";
import { permissionService } from "@/services/permissionService";
import { prisma } from "@/lib/prisma";
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

  /**
   * Exclusão permanente de usuário.
   *
   * Remove todos os rastros do usuário no sistema:
   *  1. Evidências criadas por ele (em qualquer demanda)
   *  2. Logs de auditoria criados por ele
   *  3. Demandas que ele criou (+ cascade nas evidências dessas demandas)
   *  4. Nullifica participação como responsável, aprovador, homologador e cancelador
   *     em demandas de terceiros
   *  5. Remove o registro User do banco
   *  6. Remove o usuário do Supabase Auth
   *
   * Restrições:
   *  · Apenas ADMIN pode executar
   *  · ADMIN não pode excluir a si mesmo
   */
  async deleteUser(id: string, actor: UserForPermission) {
    if (actor.role !== "ADMIN") {
      throw new Error("Apenas administradores podem excluir usuários.");
    }
    if (actor.id === id) {
      throw new Error("Você não pode excluir a sua própria conta.");
    }

    const existing = await userRepository.findById(id);
    if (!existing) throw new UserNotFoundError(id);

    // ── Remoção em transação ─────────────────────────────────────
    await prisma.$transaction(async (tx) => {
      // 1. Evidências criadas por este usuário em qualquer demanda
      await tx.demandEvidence.deleteMany({ where: { createdById: id } });

      // 2. Logs de auditoria criados por este usuário
      await tx.auditLog.deleteMany({ where: { userId: id } });

      // 3. Demandas criadas por este usuário
      //    (cascade no schema → demand_evidences são deletadas automaticamente)
      await tx.demand.deleteMany({ where: { creatorId: id } });

      // 4. Nullifica referências em demandas de outros usuários
      await tx.demand.updateMany({ where: { assigneeId:      id }, data: { assigneeId:      null } });
      await tx.demand.updateMany({ where: { approvedById:    id }, data: { approvedById:    null } });
      await tx.demand.updateMany({ where: { homologatedById: id }, data: { homologatedById: null } });
      await tx.demand.updateMany({ where: { canceledById:    id }, data: { canceledById:    null } });

      // 5. Remove o usuário do banco
      await tx.user.delete({ where: { id } });
    });

    // 6. Remove do Supabase Auth (fora da transação — operação externa)
    if (existing.authUserId) {
      try {
        await authService.deleteAuthUser(existing.authUserId);
      } catch (authErr) {
        // Não reverte a transação — o banco já está limpo.
        // Loga para facilitar diagnóstico (ex.: usuário já removido do Auth).
        console.warn(
          `[deleteUser] falha ao remover authUserId ${existing.authUserId} do Supabase Auth:`,
          authErr instanceof Error ? authErr.message : authErr,
        );
      }
    }
  },
};
