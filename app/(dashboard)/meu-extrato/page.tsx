import { redirect }     from "next/navigation";
import { requireAuth, toPermissionUser } from "@/server/auth/helpers";
import { canViewMyStatement } from "@/server/auth/permissions";
import { monthlyStatementService } from "@/services/monthlyStatementService";
import { StatementView } from "@/components/statement/StatementView";

type SearchParams = Promise<{ month?: string; year?: string }>;

export default async function MeuExtratoPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireAuth();
  const actor   = toPermissionUser(session);

  if (!canViewMyStatement(actor)) redirect("/dashboard");

  const sp = await searchParams;

  const now   = new Date();
  const month = sp.month ? parseInt(sp.month, 10) : now.getMonth() + 1;
  const year  = sp.year  ? parseInt(sp.year,  10) : now.getFullYear();

  const safeMonth = Number.isFinite(month) && month >= 1 && month <= 12 ? month : now.getMonth() + 1;
  const safeYear  = Number.isFinite(year)  && year  >= 2020 && year  <= 2099 ? year : now.getFullYear();

  const data = await monthlyStatementService.getMyStatement(actor.id, safeMonth, safeYear);

  return (
    <StatementView
      actor={actor}
      initialData={data}
      initialMonth={safeMonth}
      initialYear={safeYear}
    />
  );
}
