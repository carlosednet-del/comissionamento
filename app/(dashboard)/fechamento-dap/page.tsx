import { redirect }         from "next/navigation";
import { requireAuth, toPermissionUser } from "@/server/auth/helpers";
import { canAccessDapClosing }           from "@/server/auth/permissions";
import { dapClosingService }             from "@/services/dapClosingService";
import { DapClosingView }                from "@/components/dap/DapClosingView";

type SearchParams = Promise<{ month?: string; year?: string }>;

export default async function FechamentoDapPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireAuth();
  const actor   = toPermissionUser(session);

  if (!canAccessDapClosing(actor)) redirect("/dashboard");

  const sp = await searchParams;

  const now  = new Date();
  const rawM = sp.month ? parseInt(sp.month, 10) : now.getMonth() + 1;
  const rawY = sp.year  ? parseInt(sp.year,  10) : now.getFullYear();

  const month = Number.isFinite(rawM) && rawM >= 1 && rawM <= 12 ? rawM : now.getMonth() + 1;
  const year  = Number.isFinite(rawY) && rawY >= 2020 && rawY <= 2099 ? rawY : now.getFullYear();

  const data = await dapClosingService.getClosingPreview(month, year, {});

  return (
    <DapClosingView
      initialData={data}
      initialMonth={month}
      initialYear={year}
    />
  );
}
