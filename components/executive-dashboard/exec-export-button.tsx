"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { exportExecDashboardAction } from "@/server/actions/executiveDashboardActions";
import type { ExecutiveDashboardFilters } from "@/validations/executive-dashboard";

export function ExecExportButton({ filters }: { filters: ExecutiveDashboardFilters }) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const result = await exportExecDashboardAction(filters);
      if (!result.success) {
        toast.error(result.error ?? "Erro ao exportar.");
        return;
      }
      if (!result.data) return;
      const { csv, filename } = result.data;
      const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Exportação concluída.");
    } catch {
      toast.error("Erro inesperado ao exportar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={loading} className="gap-2">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Exportar CSV
    </Button>
  );
}
