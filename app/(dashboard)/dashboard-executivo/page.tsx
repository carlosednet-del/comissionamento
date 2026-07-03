import { redirect } from "next/navigation";
import { requireAuth, toPermissionUser } from "@/server/auth/helpers";
import { canViewExecutiveDashboard }    from "@/server/auth/permissions";
import { getExecDashboardDataAction, getExecDashboardMetaAction } from "@/server/actions/executiveDashboardActions";
import { ExecDashboardClient } from "@/components/executive-dashboard/exec-dashboard-client";
import type { ExecutiveDashboardFilters } from "@/validations/executive-dashboard";

function defaultFilters(): ExecutiveDashboardFilters {
  const today = new Date();
  const startDate = new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10); // 1 jan do ano corrente
  const endDate   = today.toISOString().slice(0, 10);
  return { startDate, endDate, homologatedOnly: true };
}

export default async function DashboardExecutivoPage() {
  const session = await requireAuth();
  const actor   = toPermissionUser(session);

  if (!canViewExecutiveDashboard(actor)) {
    redirect("/dashboard?error=sem-permissao");
  }

  const filters = defaultFilters();

  const [dataResult, meta] = await Promise.all([
    getExecDashboardDataAction(filters),
    getExecDashboardMetaAction(),
  ]);

  if (!dataResult.success) {
    throw new Error(dataResult.error ?? "Erro ao carregar dashboard executivo.");
  }
  if (!dataResult.data) {
    throw new Error("Erro ao carregar dashboard executivo.");
  }

  return (
    <div className="p-6 md:p-8 max-w-screen-2xl mx-auto">
      <ExecDashboardClient
        initialData={dataResult.data}
        initialFilters={filters}
        directors={meta.directors}
        collaborators={meta.collaborators}
      />
    </div>
  );
}

export const metadata = {
  title: "Dashboard Executivo",
  description: "Produtividade e valor gerado pelas demandas técnicas homologadas.",
};
