"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { loginSchema, type LoginInput } from "@/validations/auth";
import { loginAction } from "@/server/actions/authActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { AlertCircle, Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { signIn } from "next-auth/react";

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="1"  y="1"  width="9" height="9" fill="#f25022" />
      <rect x="11" y="1"  width="9" height="9" fill="#00a4ef" />
      <rect x="1"  y="11" width="9" height="9" fill="#7fba00" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

export function LoginForm({ next, microsoftEnabled = false }: { next?: string; microsoftEnabled?: boolean }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [microsoftLoading, setMicrosoftLoading] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    const result = await loginAction(values);

    if (!result.success) {
      setServerError(result.error);
      return;
    }

    router.push(result.data?.redirectTo ?? "/demandas");
    router.refresh();
  }

  async function handleMicrosoftLogin() {
    setServerError(null);
    setMicrosoftLoading(true);
    try {
      const redirectPath = next && /^\/[^/]/.test(next) ? next : "/dashboard";
      await signIn("microsoft-entra-id", { redirectTo: redirectPath });
      // NextAuth redireciona automaticamente para a Microsoft
    } catch {
      setServerError("Erro ao conectar com Microsoft. Tente novamente.");
      setMicrosoftLoading(false);
    }
  }

  return (
    <div className="space-y-5">

      {/* Server error banner */}
      {serverError && (
        <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <AlertDescription className="text-sm font-medium">{serverError}</AlertDescription>
        </Alert>
      )}

      {/* Botão Microsoft — só aparece quando o provider está configurado */}
      {microsoftEnabled && (
        <>
          <Button
            type="button"
            variant="outline"
            disabled={microsoftLoading || isSubmitting}
            onClick={handleMicrosoftLogin}
            className="h-11 w-full rounded-xl border-slate-200 bg-white font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:shadow-md active:scale-[0.98] disabled:opacity-60"
          >
            {microsoftLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Redirecionando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <MicrosoftIcon className="h-4 w-4 shrink-0" />
                Entrar com Microsoft
              </span>
            )}
          </Button>

          {/* Divisor */}
          <div className="relative flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">ou</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
        </>
      )}

      {/* Formulário email + senha */}
      <Form {...form}>
        <form method="post" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>

          {/* E-mail field */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-sm font-semibold text-brand-text-dark">
                  E-mail
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="seu@empresa.com"
                    autoComplete="email"
                    disabled={isSubmitting || microsoftLoading}
                    className="h-11 rounded-lg border-slate-200 bg-slate-50/60 text-brand-text-dark placeholder:text-brand-text-muted focus-visible:border-brand-hover focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-brand-accent/30 disabled:opacity-60"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs text-red-500" />
              </FormItem>
            )}
          />

          {/* Password field */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-sm font-semibold text-brand-text-dark">
                  Senha
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      disabled={isSubmitting || microsoftLoading}
                      className="h-11 rounded-lg border-slate-200 bg-slate-50/60 pr-11 text-brand-text-dark placeholder:text-brand-text-muted focus-visible:border-brand-hover focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-brand-accent/30 disabled:opacity-60"
                      {...field}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-muted transition-colors hover:text-brand-hover"
                      aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage className="text-xs text-red-500" />
              </FormItem>
            )}
          />

          {/* Submit button */}
          <Button
            type="submit"
            disabled={isSubmitting || microsoftLoading}
            className="h-11 w-full rounded-xl bg-gradient-to-r from-brand-primary to-brand-hover font-semibold text-white shadow-md shadow-brand-primary/25 transition-all hover:opacity-90 hover:shadow-lg hover:shadow-brand-primary/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Autenticando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                Entrar
              </span>
            )}
          </Button>

        </form>
      </Form>
    </div>
  );
}
