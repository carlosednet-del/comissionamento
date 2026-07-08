import { requireAuth } from "@/server/auth/helpers";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();

  return (
    <div className="flex">
      <Sidebar user={{ name: user.name, email: user.email, role: user.role }} />

      {/* Main content — scroll nativo do browser, sidebar permanece sticky */}
      <main className="flex-1 min-h-screen bg-gradient-to-br from-brand-bg-light/25 via-background to-background">
        {/* Brand accent line at the top */}
        <div className="h-0.5 bg-gradient-to-r from-brand-primary via-brand-accent to-transparent" />
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
