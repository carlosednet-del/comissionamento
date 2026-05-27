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
  ComplexityLevel,
  RoiLevel,
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
  ComplexityLevel,
  RoiLevel,
};

// ── Session ──────────────────────────────────────────────────────
export type { SessionUser } from "@/server/auth/helpers";

// ── Demand composite types ────────────────────────────────────────

export type DemandWithRelations = Demand & {
  creator:  Pick<User, "id" | "name">;
  assignee: Pick<User, "id" | "name"> | null;
  evidences: (DemandEvidence & { createdBy: Pick<User, "id" | "name"> | null })[];
};

export type DemandSummary = Pick<
  Demand,
  | "id"
  | "title"
  | "status"
  | "priority"
  | "demandType"
  | "createdAt"
  | "plannedDeliveryDate"
  | "estimatedHours"
  | "estimatedDemandValue"
  | "complexity"
  | "roi"
  | "requesterArea"
  | "requesterName"
> & {
  assignee: Pick<User, "id" | "name"> | null;
  creator:  Pick<User, "id" | "name">;
};

export type AuditLogWithUser = AuditLog & {
  user: Pick<User, "id" | "name" | "role">;
};

// ── User composite types ──────────────────────────────────────────

export type UserSummary = Pick<
  User,
  "id" | "name" | "email" | "role" | "workerProfile" | "isActive" | "createdAt"
>;

// ── API response types ────────────────────────────────────────────

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

export type ActionResult<T = void> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; details?: unknown };

// ── Filters ──────────────────────────────────────────────────────

export type DemandFilters = {
  status?:        DemandStatus;
  priority?:      DemandPriority;
  demandType?:    DemandType;
  assigneeId?:    string;
  requesterArea?: string;
  search?:        string;
  createdFrom?:   Date;
  createdTo?:     Date;
  deliveryFrom?:  Date;
  deliveryTo?:    Date;
  page?:     number;
  pageSize?: number;
};

export type UserFilters = {
  role?:     UserRole;
  isActive?: boolean;
  search?:   string;
};
