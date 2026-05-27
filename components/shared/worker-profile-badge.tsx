import { Badge } from "@/components/ui/badge";
import type { WorkerProfile } from "@prisma/client";

const PROFILE_LABELS: Record<WorkerProfile, string> = {
  JUNIOR: "Júnior",
  SENIOR: "Sênior",
  ESPECIALISTA: "Especialista",
};

export function WorkerProfileBadge({ profile }: { profile: WorkerProfile | null }) {
  if (!profile) return <span className="text-muted-foreground text-sm">—</span>;
  return <Badge variant="outline">{PROFILE_LABELS[profile]}</Badge>;
}
