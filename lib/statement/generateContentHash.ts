import { createHash } from "crypto";

export type HashableStatementData = {
  developerId:         string;
  periodMonth:         number;
  periodYear:          number;
  totalEstimatedHours: number;
  totalEstimatedValue: number;
  demands: Array<{
    demandId:       string;
    estimatedHours: number;
    estimatedValue: number;
  }>;
};

/** Gera um hash SHA-256 do conteúdo assinado para rastreabilidade. */
export function generateStatementContentHash(data: HashableStatementData): string {
  const sorted = {
    ...data,
    demands: [...data.demands].sort((a, b) => a.demandId.localeCompare(b.demandId)),
  };
  const content = JSON.stringify(sorted, (_k, v) =>
    typeof v === "number" ? parseFloat(v.toFixed(6)) : v
  );
  return createHash("sha256").update(content).digest("hex");
}
