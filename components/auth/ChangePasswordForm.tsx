"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updatePasswordAction } from "@/server/actions/authActions";
import { logoutAction } from "@/server/actions/authActions";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff, Lock, LogOut } from "lucide-react";

type FieldErrors = Partial<Record<"newPassword" | "confirmPassword", string>>;

export function ChangePasswordForm() {
  const router = useRouter();

  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew,         setShowNew]         = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [serverError,     setServerError]     = useState<string | null>(null);
  const [fieldErrors,     setFieldErrors]     = useState<FieldErrors>({});
  const [isPending, start] = useTransition();

  function validateClient(): boolean {
    const errs: FieldErrors = {};

    const REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

    if (!newPassword) {
      errs.newPassword = "A nova senha é obrigatória.";
    } else if (newPassword.length < 8) {
      errs.newPassword = "A senha deve ter no mínimo 8 caracteres.";
    } else if (!REGEX.test(newPassword)) {
      errs.newPassword = "A senha deve conter letra maiúscula, minúscula, número e caractere especial.";
    }

    if (!confirmPassword) {
      errs.confirmPassword = "A confirmação é obrigatória.";
    } else if (newPassword !== confirmPassword) {
      errs.confirmPassword = "As senhas não conferem.";
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    if (!validateClient()) return;

    start(async () => {
      const result = await updatePasswordAction({ newPassword, confirmPassword });
      if (!result.success) {
        setServerError(result.error);
        return;
      }
      toast.success("Senha alterada com sucesso.");
      router.push("/dashboard");
      router.refresh();
    });
  }

  function handleLogout() {
    start(async () => {
      await logoutAction();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Nova senha */}
      <div className="space-y-1.5">
        <Label htmlFor="new-password">Nova senha</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="new-password"
            type={showNew ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Digite a nova senha"
            value={newPassword}
            onChange={(e) => { setNewPassword(e.target.value); setFieldErrors((f) => ({ ...f, newPassword: undefined })); }}
            disabled={isPending}
            className={`pl-9 pr-10 ${fieldErrors.newPassword ? "border-destructive focus-visible:ring-destructive" : ""}`}
          />
          <button
            type="button"
            onClick={() => setShowNew((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {fieldErrors.newPassword && (
          <p className="text-xs text-destructive">{fieldErrors.newPassword}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Mínimo 8 caracteres com maiúscula, minúscula, número e caractere especial.
        </p>
      </div>

      {/* Confirmar senha */}
      <div className="space-y-1.5">
        <Label htmlFor="confirm-password">Confirmar nova senha</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="confirm-password"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Repita a nova senha"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors((f) => ({ ...f, confirmPassword: undefined })); }}
            disabled={isPending}
            className={`pl-9 pr-10 ${fieldErrors.confirmPassword ? "border-destructive focus-visible:ring-destructive" : ""}`}
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {fieldErrors.confirmPassword && (
          <p className="text-xs text-destructive">{fieldErrors.confirmPassword}</p>
        )}
      </div>

      {/* Erro do servidor */}
      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      {/* Botões */}
      <div className="flex flex-col gap-2 pt-1">
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Atualizando…</>
            : "Atualizar senha"
          }
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full text-muted-foreground gap-2"
          onClick={handleLogout}
          disabled={isPending}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </form>
  );
}
