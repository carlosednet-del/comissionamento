import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ActiveStatus = "active" | "inactive";

const STATUS_CONFIG: Record<ActiveStatus, { label: string; className: string }> = {
  active: { label: "Ativo", className: "bg-green-100 text-green-700 border-green-200" },
  inactive: { label: "Inativo", className: "bg-red-100 text-red-700 border-red-200" },
};

export function ActiveStatusBadge({ isActive }: { isActive: boolean }) {
  const status: ActiveStatus = isActive ? "active" : "inactive";
  const { label, className } = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={cn(className)}>
      {label}
    </Badge>
  );
}
