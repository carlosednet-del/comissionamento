import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";
import { ClipboardCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Entrar — Gestor de Demandas",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-slate-100 px-4 py-12">
      <div className="w-full max-w-[400px] space-y-8">

        {/* Cabeçalho com ícone + nome do sistema */}
        <div className="flex flex-col items-center space-y-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 shadow-lg">
            <ClipboardCheck className="h-7 w-7 text-white" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Gestor de Demandas
            </h1>
            <p className="text-sm text-slate-500">Acesso interno — equipe técnica</p>
          </div>
        </div>

        {/* Card principal */}
        <Card className="border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-lg font-semibold text-slate-900">
              Entrar na conta
            </CardTitle>
            <CardDescription className="text-sm text-slate-500">
              Use suas credenciais corporativas para acessar.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <LoginForm />
          </CardContent>
        </Card>

        {/* Rodapé */}
        <p className="text-center text-xs text-slate-400">
          Problemas de acesso?{" "}
          <span className="font-medium text-slate-600">
            Fale com o administrador do sistema.
          </span>
        </p>

      </div>
    </div>
  );
}
