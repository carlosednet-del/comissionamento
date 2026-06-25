import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { logoutAction } from "@/server/actions/authActions";

export const metadata = { title: "Acesso Bloqueado — Gestor de Demandas" };

export default function AcessoBloqueadoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40">
      <div className="text-center space-y-4 max-w-sm px-4">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <ShieldX className="h-10 w-10 text-destructive" />
          </div>
        </div>
        <h1 className="text-2xl font-bold">Conta desativada</h1>
        <p className="text-muted-foreground text-sm">
          Sua conta foi desativada. Entre em contato com o administrador do sistema para reativar o
          acesso.
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" asChild>
            <Link href="/login">Ir para login</Link>
          </Button>
          <form action={logoutAction}>
            <Button type="submit" variant="destructive">
              Sair
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
