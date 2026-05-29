"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useTransition }               from "react";
import { Input }    from "@/components/ui/input";
import { Button }   from "@/components/ui/button";
import { Label }    from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, X, SlidersHorizontal } from "lucide-react";
import type { DemandPriority, DemandType, ComplexityLevel, RoiLevel } from "@prisma/client";

// ── Opções ─────────────────────────────────────────────────────────

const PRIORITY_OPTIONS: { value: DemandPriority; label: string }[] = [
  { value: "CRITICA", label: "Crítica" },
  { value: "ALTA",    label: "Alta"    },
  { value: "MEDIA",   label: "Média"   },
  { value: "BAIXA",   label: "Baixa"   },
];

const TYPE_OPTIONS: { value: DemandType; label: string }[] = [
  { value: "NOVA_SOLUCAO",      label: "Nova solução"  },
  { value: "EVOLUCAO_PRODUCAO", label: "Evolução"      },
  { value: "CORRECAO",          label: "Correção"      },
  { value: "AUTOMACAO",         label: "Automação"     },
  { value: "DASHBOARD",         label: "Dashboard"     },
  { value: "INTEGRACAO",        label: "Integração"    },
  { value: "OUTRO",             label: "Outro"         },
];

const COMPLEXITY_OPTIONS: { value: ComplexityLevel; label: string }[] = [
  { value: "BAIXA",   label: "Baixa"    },
  { value: "MEDIA",   label: "Média"    },
  { value: "ALTA",    label: "Alta"     },
  { value: "CRITICA", label: "Crítica"  },
];

const ROI_OPTIONS: { value: RoiLevel; label: string }[] = [
  { value: "BAIXO",       label: "Baixo"       },
  { value: "MEDIO",       label: "Médio"       },
  { value: "ALTO",        label: "Alto"        },
  { value: "ESTRATEGICO", label: "Estratégico" },
];

const DEADLINE_OPTIONS = [
  { value: "overdue", label: "Atrasadas"    },
  { value: "today",   label: "Vence hoje"   },
  { value: "soon",    label: "Próximos 3d"  },
  { value: "ok",      label: "No prazo"     },
];

const SORT_OPTIONS = [
  { value: "priority", label: "Prioridade"  },
  { value: "deadline", label: "Prazo"       },
  { value: "created",  label: "Mais recente"},
  { value: "title",    label: "Título"      },
];

// ── Props ──────────────────────────────────────────────────────────

type Props = {
  showMyDemandsToggle?: boolean; // false para FINANCEIRO/APROVADOR
};

// ── Componente ─────────────────────────────────────────────────────

export function DemandKanbanFilters({ showMyDemandsToggle = true }: Props) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const current = useCallback(
    (key: string) => searchParams.get(key) ?? "",
    [searchParams],
  );

  function update(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value) {
      params.delete(key);
    } else {
      params.set(key, value);
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

  const hasFilters =
    !!current("search") || !!current("priority") || !!current("demandType") ||
    !!current("complexity") || !!current("roi") || !!current("deadlineStatus") ||
    !!current("onlyMine");

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-3">
      {/* Ícone de filtros */}
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <SlidersHorizontal className="h-4 w-4" />
        Filtros
      </div>

      {/* Search */}
      <div className="flex-1 min-w-[200px]">
        <Label className="sr-only">Buscar</Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar demandas…"
            className="pl-9 h-9"
            defaultValue={current("search")}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                update("search", (e.target as HTMLInputElement).value || null);
              }
            }}
            onBlur={(e) => {
              const val = e.target.value;
              if (val !== current("search")) update("search", val || null);
            }}
          />
        </div>
      </div>

      {/* Prioridade */}
      <div className="w-32">
        <Label className="sr-only">Prioridade</Label>
        <Select
          value={current("priority") || "_all"}
          onValueChange={(v) => update("priority", v === "_all" ? null : v)}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todas prioridades</SelectItem>
            {PRIORITY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tipo */}
      <div className="w-36">
        <Label className="sr-only">Tipo</Label>
        <Select
          value={current("demandType") || "_all"}
          onValueChange={(v) => update("demandType", v === "_all" ? null : v)}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos os tipos</SelectItem>
            {TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Complexidade */}
      <div className="w-32">
        <Label className="sr-only">Complexidade</Label>
        <Select
          value={current("complexity") || "_all"}
          onValueChange={(v) => update("complexity", v === "_all" ? null : v)}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Complexidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Complexidade</SelectItem>
            {COMPLEXITY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ROI */}
      <div className="w-32">
        <Label className="sr-only">ROI</Label>
        <Select
          value={current("roi") || "_all"}
          onValueChange={(v) => update("roi", v === "_all" ? null : v)}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="ROI" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">ROI</SelectItem>
            {ROI_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Prazo */}
      <div className="w-36">
        <Label className="sr-only">Prazo</Label>
        <Select
          value={current("deadlineStatus") || "_all"}
          onValueChange={(v) => update("deadlineStatus", v === "_all" ? null : v)}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Prazo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos os prazos</SelectItem>
            {DEADLINE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Ordenar */}
      <div className="w-36">
        <Label className="sr-only">Ordenar por</Label>
        <Select
          value={current("sortBy") || "priority"}
          onValueChange={(v) => update("sortBy", v === "priority" ? null : v)}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Somente minhas */}
      {showMyDemandsToggle && (
        <Button
          variant={current("onlyMine") === "true" ? "default" : "outline"}
          size="sm"
          className="h-9 gap-1.5"
          onClick={() =>
            update("onlyMine", current("onlyMine") === "true" ? null : "true")
          }
        >
          Minhas demandas
        </Button>
      )}

      {/* Limpar filtros */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-1.5 text-muted-foreground"
          onClick={clearAll}
          disabled={isPending}
        >
          <X className="h-3.5 w-3.5" />
          Limpar
        </Button>
      )}
    </div>
  );
}
