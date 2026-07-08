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
  StatementStatus,
  DeveloperMonthlyStatement,
  DeveloperMonthlyStatementItem,
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
  StatementStatus,
  DeveloperMonthlyStatement,
  DeveloperMonthlyStatementItem,
};

// ── Session ──────────────────────────────────────────────────────
export type { SessionUser } from "@/server/auth/helpers";

// ── Demand composite types ────────────────────────────────────────

export type DemandWithRelations = Demand & {
  creator:       Pick<User, "id" | "name">;
  assignee:      Pick<User, "id" | "name"> | null;
  approvedBy:    Pick<User, "id" | "name"> | null;
  homologatedBy: Pick<User, "id" | "name"> | null;
  canceledBy:    Pick<User, "id" | "name"> | null;
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
  | "directorPriorityOrder"
  | "assigneeProfileSnapshot"
  | "hourlyRateSnapshot"
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
  creatorId?:     string;
  requesterArea?:  string;
  requesterAreas?: string[];
  search?:         string;
  createdFrom?:    Date;
  createdTo?:      Date;
  deliveryFrom?:   Date;
  deliveryTo?:     Date;
  isDeflated?:     boolean;
  page?:     number;
  pageSize?: number;
};

export type UserFilters = {
  role?:     UserRole;
  isActive?: boolean;
  search?:   string;
};

// ── Statement composite types ─────────────────────────────────────

export type StatementPreviewItem = {
  demandId:        string;
  demandCode:      string;
  demandTitle:     string;
  requesterArea:   string | null;
  demandType:      string | null;
  complexity:      string | null;
  roi:             string | null;
  estimatedHours:  number;
  hourlyRate:      number | null;
  estimatedValue:  number;
  deliveryDate:    string | null;
};

export type StatementTotals = {
  totalDemands:        number;
  totalEstimatedHours: number;
  totalEstimatedValue: number;
};

export type StatementSignatureInfo = {
  id:                string;
  status:            StatementStatus;
  signedAt:          string | null;
  signatureCode:     string | null;
  signatureIp:       string | null;
  signatureUserAgent: string | null;
  contentHash:       string | null;
};

export type StatementData = {
  developer: {
    id:           string;
    name:         string;
    email:        string;
    workerProfile: string | null;
  };
  periodMonth:  number;
  periodYear:   number;
  items:        StatementPreviewItem[];
  totals:       StatementTotals;
  statement:    StatementSignatureInfo | null;
};

// ── DAP Closing composite types ───────────────────────────────────

export type DapClosingFilters = {
  developerId?:    string;
  statementStatus?: StatementStatus | "NONE";
  requesterArea?:  string;
  workerProfile?:  string;
  demandType?:     string;
  complexity?:     string;
  roi?:            string;
};

export type DapDemandRow = {
  demandId:               string;
  demandCode:             string;
  demandTitle:            string;
  requesterArea:          string | null;
  demandType:             string | null;
  complexity:             string | null;
  roi:                    string | null;
  estimatedHours:         number;
  hourlyRate:             number | null;
  estimatedValue:         number;
  homologationDate:       string | null;
  assigneeProfileSnapshot: string | null;
  directorPriorityOrder:  number | null;
  plannedDeliveryDate:    string | null;
  actualDeliveryDate:     string | null;
};

export type DapDeveloperRow = {
  developerId:      string;
  developerName:    string;
  developerEmail:   string;
  developerProfile: string | null;
  totalDemands:     number;
  totalEstimatedHours: number;
  totalEstimatedValue: number;
  statementId:      string | null;
  statementStatus:  StatementStatus | null;
  signatureCode:    string | null;
  signedAt:         string | null;
  signatureIp:      string | null;
  signatureUserAgent: string | null;
  contentHash:      string | null;
  demands:          DapDemandRow[];
};

export type DapClosingPreview = {
  periodMonth:          number;
  periodYear:           number;
  totalDevs:            number;
  totalDemands:         number;
  totalEstimatedHours:  number;
  totalEstimatedValue:  number;
  signedCount:          number;
  exportedCount:        number;
  pendingCount:         number;
  signaturePercentage:  number;
  developers:           DapDeveloperRow[];
};
