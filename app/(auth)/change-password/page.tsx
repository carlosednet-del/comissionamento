import { redirect }         from "next/navigation";
import { requireAuth }       from "@/server/auth/helpers";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { ShieldAlert, Layers } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Trocar senha — Gestor de Demandas" };

export default async function ChangePasswordPage() {
  const user = await requireAuth();

  if (!user.forcePasswordChange) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-bg-light/30 via-background to-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary shadow-lg">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-sm font-semibold text-muted-foreground">Gestor de Demandas Técnicas</h2>
        </div>

        <Card className="shadow-lg border-amber-200">
          <CardHeader className="text-center space-y-2 pb-4">
            <div className="flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                <ShieldAlert className="h-6 w-6 text-amber-600" />
              </div>
            </div>
            <CardTitle className="text-xl">Trocar senha</CardTitle>
            <CardDescription className="text-sm">
              Por segurança, você precisa definir uma nova senha antes de acessar o sistema.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <ChangePasswordForm role={user.role} />
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Olá, <strong>{user.name}</strong>. Esta é uma etapa obrigatória de segurança.
        </p>
      </div>
    </div>
  );
}
