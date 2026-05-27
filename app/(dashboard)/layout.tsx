import { redirect } from "next/navigation";
import { requireAuth } from "@/server/auth/helpers";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={{ name: user.name, email: user.email, role: user.role }} />
      <main className="flex-1 overflow-y-auto bg-muted/20">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

export { redirect };
