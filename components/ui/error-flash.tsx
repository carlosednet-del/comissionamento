"use client";

import { useEffect } from "react";
import { toast } from "sonner";

const MESSAGES: Record<string, string> = {
  "sem-permissao": "Você não tem permissão para acessar essa área.",
  "auth-callback":  "Erro na autenticação. Faça login novamente.",
};

export function ErrorFlash({ error }: { error?: string }) {
  const message = error ? (MESSAGES[error] ?? "Ocorreu um erro inesperado.") : null;

  useEffect(() => {
    if (message) toast.error(message);
  }, [message]);

  return null;
}
