import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { Check, ClipboardCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Entrar — Gestor de Demandas",
};

const FEATURES = [
  "Gestão centralizada de demandas técnicas",
  "Fluxo de aprovação e homologação",
  "Métricas e relatórios de entrega",
];

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">

      {/* ── Painel esquerdo — identidade da marca ─────────────────── */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-brand-primary p-12 lg:flex lg:w-[46%]">

        {/* Grade de pontos sutil */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Círculo decorativo inferior-direito */}
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-white/5"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-white/5"
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
            <ClipboardCheck className="h-5 w-5 text-white" strokeWidth={1.75} />
          </div>
          <span className="text-base font-semibold tracking-tight text-white/90">
            Gestor de Demandas
          </span>
        </div>

        {/* Headline central */}
        <div className="relative z-10 space-y-7">
          <h2 className="text-[2.6rem] font-extrabold leading-[1.15] tracking-tight text-white">
            Organize.<br />
            Homologue.<br />
            Entregue.
          </h2>

          <p className="max-w-xs text-base leading-relaxed text-white/65">
            Centralize demandas técnicas, controle homologações e acompanhe entregas — tudo em um só lugar.
          </p>

          <ul className="space-y-3">
            {FEATURES.map((feat) => (
              <li key={feat} className="flex items-center gap-3 text-sm text-white/80">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <Check className="h-3 w-3 text-white" strokeWidth={2.5} />
                </span>
                {feat}
              </li>
            ))}
          </ul>
        </div>

        {/* Badge inferior */}
        <div className="relative z-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-white/60" aria-hidden />
            Acesso interno — equipe de tecnologia
          </span>
        </div>
      </aside>

      {/* ── Painel direito — formulário ───────────────────────────── */}
      <main className="flex flex-1 flex-col items-center justify-center bg-white px-8 py-16">

        {/* Logo visível só no mobile */}
        <div className="mb-10 flex flex-col items-center gap-3 lg:hidden">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-primary shadow-lg">
            <ClipboardCheck className="h-6 w-6 text-white" strokeWidth={1.75} />
          </div>
          <span className="text-lg font-bold text-brand-text-dark">Gestor de Demandas</span>
        </div>

        {/* Área do formulário */}
        <div className="w-full max-w-[380px]">

          <div className="mb-8 space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-brand-text-dark">
              Entrar na conta
            </h1>
            <p className="text-sm text-brand-text-muted">
              Use suas credenciais corporativas para acessar.
            </p>
          </div>

          <LoginForm />

          <p className="mt-10 text-center text-xs text-brand-text-muted/60">
            Gestor de Demandas Técnicas
            <span className="mx-1.5" aria-hidden>·</span>
            Ambiente interno
          </p>
        </div>
      </main>

    </div>
  );
}
