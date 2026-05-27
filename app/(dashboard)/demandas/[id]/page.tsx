import { notFound } from "next/navigation";
import { requireAuth, toPermissionUser } from "@/server/auth/helpers";
import { demandService } from "@/services/demandService";
import { DemandDetail } from "@/components/demandas/demand-detail";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { AuditLog } from "@prisma/client";

export const metadata = { title: "Detalhe da demanda — Gestor de Demandas" };

type AuditLogWithUser = AuditLog & {
  user: { id: string; name: string };
};

export default async function DemandaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id }  = await params;
  const session = await requireAuth();
  const actor   = toPermissionUser(session);

  let demand;
  try {
    demand = await demandService.getById(id, actor);
  } catch {
    notFound();
  }

  if (!demand) notFound();

  const auditLogs = await demandService.getAuditLogs(id);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/demandas">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Demandas
          </Link>
        </Button>
      </div>

      <DemandDetail
        demand={demand}
        actor={actor}
        auditLogs={auditLogs as AuditLogWithUser[]}
      />
    </div>
  );
}
