import { requireAuth } from "@/server/auth/helpers";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={{ name: user.name, email: user.email, role: user.role }} />

      {/* Main content — subtle gradient from brand-bg-light tint to white */}
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-brand-bg-light/25 via-background to-background">
        {/* Brand accent line at the top */}
        <div className="h-0.5 bg-gradient-to-r from-brand-primary via-brand-accent to-transparent" />
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
