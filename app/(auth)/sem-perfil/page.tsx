import { logoutAction } from "@/server/actions/authActions";
import { Button } from "@/components/ui/button";
import { AlertTriangle, LogOut, RefreshCw } from "lucide-react";

export const metadata = { title: "Perfil não encontrado — Gestor de Demandas" };

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
            Perfil não encontrado
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            Sua conta está autenticada, mas não existe um perfil de usuário
            correspondente no banco de dados.
          </p>
        </div>

        {/* Instruções */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-left space-y-3">
          <p className="text-sm font-semibold text-amber-800">
            Como resolver:
          </p>
          <ol className="list-decimal list-inside space-y-1.5 text-sm text-amber-700">
            <li>
              Verifique se a chave <code className="font-mono bg-amber-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> no arquivo <code className="font-mono bg-amber-100 px-1 rounded">.env</code> está correta.
            </li>
            <li>
              Execute o seed para criar o usuário admin no banco:{" "}
              <code className="block mt-1 font-mono bg-amber-100 px-2 py-1 rounded text-xs">
                npm run db:seed
              </code>
            </li>
            <li>
              Após o seed, faça logout e login novamente.
            </li>
          </ol>
        </div>

        {/* Detalhes técnicos */}
        <p className="text-xs text-slate-400">
          O seed cria o usuário <strong>admin@gestor.local</strong> com a senha <strong>Admin@123456</strong> e vincula o perfil Supabase ao banco de dados.
        </p>

        {/* Ações */}
        <div className="flex flex-col gap-3">
          <form action={logoutAction}>
            <Button
              type="submit"
              variant="outline"
              className="w-full gap-2 border-slate-300"
            >
              <LogOut className="h-4 w-4" />
              Fazer logout e tentar novamente
            </Button>
          </form>

          <a href="/sem-perfil">
            <Button variant="ghost" size="sm" className="w-full gap-2 text-slate-400">
              <RefreshCw className="h-3 w-3" />
              Recarregar após executar o seed
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
