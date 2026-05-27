import type {
  User,
  Demand,
  DemandEvidence,
  AuditLog,
  UserRole,
  WorkerProfile,
  DemandType,
  DemandPriority,
  DemandStatus,
  AuditAction,
} from "@prisma/client";

export type {
  User,
  Demand,
  DemandEvidence,
  AuditLog,
  UserRole,
  WorkerProfile,
  DemandType,
  DemandPriority,
  DemandStatus,
  AuditAction,
};

// -------------------------------------------------------
// Tipos de sessão
// -------------------------------------------------------

export type { SessionUser } from "@/server/auth/helpers";

// -------------------------------------------------------
// Tipos compostos / enriquecidos
// -------------------------------------------------------

export type DemandWithRelations = Demand & {
  creator: User;
  assignee: User | null;
  evidences: DemandEvidence[];
};

export type DemandSummary = Pick<
  Demand,
  "id" | "title" | "status" | "priority" | "demandType" | "createdAt" | "plannedDeliveryDate"
> & {
  assignee: Pick<User, "id" | "name"> | null;
  creator: Pick<User, "id" | "name">;
};

export type UserSummary = Pick<User, "id" | "name" | "email" | "role" | "workerProfile" | "isActive" | "createdAt">;

// -------------------------------------------------------
// Resposta de API
// -------------------------------------------------------

export type ApiResponse<T> = {
  data: T;
  message?: string;
};

export type ApiError = {
  error: string;
  details?: unknown;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// -------------------------------------------------------
// Filtros
// -------------------------------------------------------

export type DemandFilters = {
  status?: DemandStatus;
  priority?: DemandPriority;
  demandType?: DemandType;
  assigneeId?: string;
  creatorId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type UserFilters = {
  role?: UserRole;
  isActive?: boolean;
  search?: string;
};

// -------------------------------------------------------
// Server Action result
// -------------------------------------------------------

export type ActionResult<T = void> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; details?: unknown };
