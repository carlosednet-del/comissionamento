import Link from "next/link";
import { logoutAction } from "@/server/actions/authActions";
import { Button } from "@/components/ui/button";
import { AlertTriangle, LogOut, ArrowLeft } from "lucide-react";

export const metadata = { title: "Acesso não liberado — Gestor de Demandas" };

export default function SemPerfilPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        {/* Ícone */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <AlertTriangle className="h-8 w-8 text-amber-600" />
        </div>

        {/* Título */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-800">
            Acesso não liberado
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            Sua identidade foi confirmada, mas esta conta ainda não tem acesso
            ao Gestor de Demandas.
          </p>
        </div>

        {/* Motivos possíveis */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-left space-y-3">
          <p className="text-sm font-semibold text-amber-800">
            Isso costuma acontecer quando:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-amber-700">
            <li>O e-mail usado no login ainda não foi cadastrado no sistema.</li>
            <li>O cadastro existe, mas está <strong>inativo</strong>.</li>
            <li>
              Você entrou com uma conta diferente da cadastrada — confira se é o
              seu e-mail corporativo.
            </li>
          </ul>
        </div>

        {/* Próximo passo */}
        <p className="text-sm text-slate-500 leading-relaxed">
          Peça a um administrador para liberar seu acesso, informando o e-mail
          que você usou para entrar.
        </p>

        {/* Ações */}
        <div className="flex flex-col gap-3">
          <Link href="/login" className="w-full">
            <Button variant="outline" className="w-full gap-2 border-slate-300">
              <ArrowLeft className="h-4 w-4" />
              Voltar para o login
            </Button>
          </Link>

          {/* Só é útil no caso em que existe sessão sem registro no banco */}
          <form action={logoutAction}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full gap-2 text-slate-400"
            >
              <LogOut className="h-3 w-3" />
              Encerrar sessão
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
