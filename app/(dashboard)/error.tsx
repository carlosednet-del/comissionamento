"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Dashboard Error]", error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
        <AlertTriangle className="h-8 w-8 text-red-600" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold text-slate-800">Algo deu errado</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          {error.message || "Ocorreu um erro inesperado ao carregar esta página."}
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground font-mono">
            ID: {error.digest}
          </p>
        )}
      </div>

      <Button onClick={reset} variant="outline" className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Tentar novamente
      </Button>
    </div>
  );
}
