import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@prisma/client";

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN:       "Admin",
  DIRETOR:     "Diretor",
  GESTOR:      "Gestor",
  DEV:         "Desenvolvedor",
  SUPORTE:     "Suporte",
  ARQUITETO:   "Arquiteto",
  APROVADOR:   "Aprovador",
  FINANCEIRO:  "Financeiro",
  SOLICITANTE: "Solicitante",
};

const ROLE_VARIANTS: Record<UserRole, "default" | "secondary" | "destructive" | "outline"> = {
  ADMIN:       "destructive",
  DIRETOR:     "destructive",
  GESTOR:      "default",
  DEV:         "secondary",
  SUPORTE:     "secondary",
  ARQUITETO:   "secondary",
  APROVADOR:   "outline",
  FINANCEIRO:  "outline",
  SOLICITANTE: "outline",
};

export function RoleBadge({ role }: { role: UserRole }) {
  return <Badge variant={ROLE_VARIANTS[role]}>{ROLE_LABELS[role]}</Badge>;
}
