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
    /* Page wrapper — gradient driven by brand CSS variables */
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-brand-bg-light via-brand-bg-base to-brand-bg-mid px-4 py-12">

      {/* Abstract blur circles ────────────────────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-32 h-[480px] w-[480px] rounded-full bg-brand-accent/35 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full bg-brand-primary/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/3 top-1/2 h-[300px] w-[300px] -translate-y-1/2 rounded-full bg-brand-bg-mid/30 blur-2xl"
      />

      {/* Content ─────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-[420px] space-y-8">

        {/* Logotype + tagline */}
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-primary to-brand-accent shadow-lg shadow-brand-primary/30">
            <ClipboardCheck className="h-8 w-8 text-white" strokeWidth={1.75} />
          </div>

          <div className="space-y-2">
            <h1 className="text-[1.625rem] font-extrabold leading-tight tracking-tight text-brand-text-dark">
              Gestor de Demandas
            </h1>
            <p className="text-sm font-medium text-brand-text-body">
              Organize, acompanhe e homologue entregas técnicas.
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-bg-light px-3 py-1 text-xs font-semibold text-brand-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-hover" aria-hidden />
              Acesso interno — equipe de tecnologia
            </span>
          </div>
        </div>

        {/* Login card */}
        <Card className="rounded-3xl border border-brand-bg-light bg-white/80 shadow-2xl shadow-brand-primary/10 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-2 pt-6">
            <CardTitle className="text-lg font-bold text-brand-text-dark">
              Entrar na conta
            </CardTitle>
            <CardDescription className="text-sm text-brand-text-body">
              Use suas credenciais corporativas para acessar.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-7 pt-4">
            <LoginForm />
          </CardContent>
        </Card>

        {/* Footer note */}
        <p className="text-center text-xs text-brand-text-muted">
          Gestor de Demandas Técnicas
          <span className="mx-1.5 text-brand-bg-mid" aria-hidden>•</span>
          Ambiente interno
        </p>

      </div>
    </div>
  );
}
