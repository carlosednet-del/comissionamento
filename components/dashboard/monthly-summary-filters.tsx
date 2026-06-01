"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Label }  from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CalendarRange, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SORT_OPTIONS } from "@/services/dashboardService";
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

const ROLE_CHIPS = [
  { value: "_all",      label: "Todos"    },
  { value: "DEV",       label: "Dev"      },
  { value: "SUPORTE",   label: "Suporte"  },
  { value: "ARQUITETO", label: "Arquiteto"},
];

const PROFILE_CHIPS = [
  { value: "_all",         label: "Todos"      },
  { value: "JUNIOR",       label: "Júnior"     },
  { value: "PLENO",        label: "Pleno"      },
  { value: "SENIOR",       label: "Sênior"     },
  { value: "ESPECIALISTA", label: "Especialista"},
];

// ── Props ─────────────────────────────────────────────────────────

type Props = {
  collaborators: DevCollaborator[];
};

// ── Componente ────────────────────────────────────────────────────

export function MonthlySummaryFilters({ collaborators }: Props) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const now = new Date();
  const defaultMonth = String(now.getMonth() + 1);
  const defaultYear  = String(now.getFullYear());

  // Lê estado atual da URL
  const selectedMonth   = searchParams.get("month")      ?? defaultMonth;
  const selectedYear    = searchParams.get("year")       ?? defaultYear;
  const selectedCollab  = searchParams.get("assigneeId") ?? "_all";
  const selectedRole    = searchParams.get("role")       ?? "_all";
  const selectedProfile = searchParams.get("profile")    ?? "_all";
  const selectedSortBy  = searchParams.get("sortBy")     ?? "finalValue";
  const selectedSortDir = searchParams.get("sortDir")    ?? "desc";
  const selectedSort    = `${selectedSortBy}:${selectedSortDir}`;

  // Verifica se algum filtro não-padrão está ativo
  const hasActiveFilters =
    selectedCollab  !== "_all"          ||
    selectedRole    !== "_all"          ||
    selectedProfile !== "_all"          ||
    selectedSort    !== "finalValue:desc" ||
    selectedMonth   !== defaultMonth    ||
    selectedYear    !== defaultYear;

  // ── Helpers de atualização de URL ─────────────────────────────

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

  function updateSort(combined: string) {
    const [sb, sd] = combined.split(":");
    const params = new URLSearchParams(searchParams.toString());
    if (sb === "finalValue" && sd === "desc") {
      params.delete("sortBy");
      params.delete("sortDir");
    } else {
      params.set("sortBy", sb);
      params.set("sortDir", sd ?? "desc");
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function clearAll() {
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  }

  // ── Renderização ──────────────────────────────────────────────

  return (
    <div
      className={cn(
        "rounded-xl border bg-card shadow-sm space-y-3 px-4 py-3 transition-opacity duration-150",
        isPending && "opacity-60 pointer-events-none",
      )}
    >
      {/* ── Linha 1: Período + Colaborador + Sort + Clear ───────── */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Ícone + label */}
        <div className="flex items-center gap-1.5 self-end pb-[9px] text-xs font-semibold text-muted-foreground">
          <CalendarRange className="h-3.5 w-3.5" />
          Período
        </div>

        {/* Mês */}
        <div className="flex flex-col gap-1">
          <Label className="text-[11px] text-muted-foreground">Mês</Label>
          <Select value={selectedMonth} onValueChange={(v) => update("month", v)}>
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
          <Label className="text-[11px] text-muted-foreground">Ano</Label>
          <Select value={selectedYear} onValueChange={(v) => update("year", v)}>
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

        {/* Separador visual */}
        <div className="hidden sm:block self-end h-9 w-px bg-border mx-0.5" />

        {/* Colaborador */}
        {collaborators.length > 0 && (
          <div className="flex flex-col gap-1">
            <Label className="text-[11px] text-muted-foreground">Colaborador</Label>
            <Select value={selectedCollab} onValueChange={(v) => update("assigneeId", v)}>
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

        {/* Ordenar por */}
        <div className="flex flex-col gap-1">
          <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
            <SlidersHorizontal className="h-3 w-3" />
            Ordenar por
          </Label>
          <Select value={selectedSort} onValueChange={updateSort}>
            <SelectTrigger className="h-9 w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Limpar filtros */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 self-end gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={clearAll}
          >
            <X className="h-3.5 w-3.5" />
            Limpar
          </Button>
        )}
      </div>

      {/* ── Linha 2: Chips de Papel e Perfil ─────────────────────── */}
      <div className="flex flex-wrap items-start gap-x-6 gap-y-2 pt-0.5 border-t">

        {/* Papel (role) */}
        <div className="flex items-center gap-2 pt-2">
          <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap">
            Papel
          </span>
          <div className="flex flex-wrap gap-1">
            {ROLE_CHIPS.map((r) => (
              <Chip
                key={r.value}
                label={r.label}
                active={selectedRole === r.value}
                onClick={() => update("role", r.value)}
              />
            ))}
          </div>
        </div>

        {/* Perfil */}
        <div className="flex items-center gap-2 pt-2">
          <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap">
            Perfil
          </span>
          <div className="flex flex-wrap gap-1">
            {PROFILE_CHIPS.map((p) => (
              <Chip
                key={p.value}
                label={p.label}
                active={selectedProfile === p.value}
                onClick={() => update("profile", p.value)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Chip de filtro ────────────────────────────────────────────────

function Chip({
  label,
  active,
  onClick,
}: {
  label:   string;
  active:  boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium transition-all",
        active
          ? "bg-primary text-primary-foreground border-primary shadow-sm"
          : "bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
