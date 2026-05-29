"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition }   from "react";
import { Label }  from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CalendarRange } from "lucide-react";
import type { DevCollaborator } from "@/services/dashboardService";

// ── Constantes ────────────────────────────────────────────────────

const MONTHS = [
  { value: "1",  label: "Janeiro"   },
  { value: "2",  label: "Fevereiro" },
  { value: "3",  label: "Março"     },
  { value: "4",  label: "Abril"     },
  { value: "5",  label: "Maio"      },
  { value: "6",  label: "Junho"     },
  { value: "7",  label: "Julho"     },
  { value: "8",  label: "Agosto"    },
  { value: "9",  label: "Setembro"  },
  { value: "10", label: "Outubro"   },
  { value: "11", label: "Novembro"  },
  { value: "12", label: "Dezembro"  },
];

function buildYears(): string[] {
  const current = new Date().getFullYear();
  return Array.from({ length: 4 }, (_, i) => String(current - 1 + i));
}

// ── Props ─────────────────────────────────────────────────────────

type Props = {
  collaborators: DevCollaborator[];
};

// ── Componente ────────────────────────────────────────────────────

export function MonthlySummaryFilters({ collaborators }: Props) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const now = new Date();
  const currentMonth = String(now.getMonth() + 1);
  const currentYear  = String(now.getFullYear());

  const selectedMonth      = searchParams.get("month")      ?? currentMonth;
  const selectedYear       = searchParams.get("year")       ?? currentYear;
  const selectedCollaborator = searchParams.get("assigneeId") ?? "_all";

  function update(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "_all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <CalendarRange className="h-4 w-4" />
        Período
      </div>

      {/* Mês */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Mês</Label>
        <Select
          value={selectedMonth}
          onValueChange={(v) => update("month", v)}
        >
          <SelectTrigger className="h-9 w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Ano */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Ano</Label>
        <Select
          value={selectedYear}
          onValueChange={(v) => update("year", v)}
        >
          <SelectTrigger className="h-9 w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {buildYears().map((y) => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Colaborador */}
      {collaborators.length > 0 && (
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Colaborador</Label>
          <Select
            value={selectedCollaborator}
            onValueChange={(v) => update("assigneeId", v)}
          >
            <SelectTrigger className="h-9 w-48">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos os colaboradores</SelectItem>
              {collaborators.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
