import { Badge } from "@/components/ui/badge";
import type { WorkerProfile } from "@prisma/client";

const PROFILE_LABELS: Record<WorkerProfile, string> = {
  JUNIOR:               "Júnior",
  PLENO:                "Pleno",
  SENIOR:               "Sênior",
  ESPECIALISTA:         "Especialista",
  SUPORTE_JUNIOR:       "Suporte Júnior",
  SUPORTE_PLENO:        "Suporte Pleno",
  SUPORTE_SENIOR:       "Suporte Sênior",
  SUPORTE_ESPECIALISTA: "Suporte Especialista",
  ARQUITETO_JUNIOR:       "Arquiteto Júnior",
  ARQUITETO_PLENO:        "Arquiteto Pleno",
  ARQUITETO_SENIOR:       "Arquiteto Sênior",
  ARQUITETO_ESPECIALISTA: "Arquiteto Especialista",
};

export function WorkerProfileBadge({ profile }: { profile: WorkerProfile | null }) {
  if (!profile) return <span className="text-muted-foreground text-sm">—</span>;
  return <Badge variant="outline">{PROFILE_LABELS[profile]}</Badge>;
}
