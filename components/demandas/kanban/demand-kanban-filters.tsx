"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useTransition }               from "react";
import { Input }  from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge }  from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, X, User, UserCheck } from "lucide-react";
import type { DemandPriority, DemandType, ComplexityLevel, RoiLevel } from "@prisma/client";
import type { KanbanAssignee, KanbanCreator } from "@/app/(dashboard)/demandas/kanban/page";
import { DEPARTMENTS, DIRECTORS } from "@/lib/constants/departments";

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
  { value: "BAIXA",   label: "Baixa"   },
  { value: "MEDIA",   label: "Média"   },
  { value: "ALTA",    label: "Alta"    },
  { value: "CRITICA", label: "Crítica" },
];

const ROI_OPTIONS: { value: RoiLevel; label: string }[] = [
  { value: "BAIXO",       label: "Baixo"       },
  { value: "MEDIO",       label: "Médio"       },
  { value: "ALTO",        label: "Alto"        },
  { value: "ESTRATEGICO", label: "Estratégico" },
];

const DEADLINE_OPTIONS = [
  { value: "overdue", label: "Atrasadas"   },
  { value: "today",   label: "Vence hoje"  },
  { value: "soon",    label: "Próximos 3d" },
  { value: "ok",      label: "No prazo"    },
];

const SORT_OPTIONS = [
  { value: "priority", label: "Prioridade"   },
  { value: "deadline", label: "Prazo"        },
  { value: "created",  label: "Mais recente" },
  { value: "title",    label: "Título"       },
];

const ROLE_LABEL: Record<string, string> = {
  DEV:       "Dev",
  GESTOR:    "Gestor",
  ARQUITETO: "Arquiteto",
  SUPORTE:   "Suporte",
};

// ── Helpers ────────────────────────────────────────────────────────

function FL({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1 pl-0.5 select-none">
      {children}
    </p>
  );
}

// ── Props ──────────────────────────────────────────────────────────

type Props = {
  showMyDemandsToggle?: boolean;
  showAssigneeFilter?:  boolean;
  assignees?:           KanbanAssignee[];
  creators?:            KanbanCreator[];
  requesterAreas?:      string[];
};

// ── Componente ─────────────────────────────────────────────────────

export function DemandKanbanFilters({
  showMyDemandsToggle = true,
  showAssigneeFilter  = false,
  assignees           = [],
  creators            = [],
  requesterAreas      = [],
}: Props) {
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
    if (!value) params.delete(key);
    else        params.set(key, value);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function clearAll() {
    startTransition(() => router.push(pathname, { scroll: false }));
  }

  const activeKeys = [
    "search", "priority", "demandType", "complexity", "roi",
    "deadlineStatus", "onlyMine", "assigneeId", "creatorId", "requesterName",
    "requesterArea", "director",
  ];
  const activeCount = activeKeys.filter((k) => !!current(k)).length;
  const hasFilters  = activeCount > 0;

  const areas = requesterAreas.length > 0 ? requesterAreas : [...DEPARTMENTS];

  return (
    <div className={`rounded-lg border bg-card px-4 py-3 space-y-3 transition-opacity ${isPending ? "opacity-60 pointer-events-none" : ""}`}>

      {/* ── Linha 1: busca + filtros estratégicos + ações ── */}
      <div className="flex flex-wrap items-end gap-x-3 gap-y-2">

        {/* Busca */}
        <div className="flex-1 min-w-[200px]">
          <FL>Buscar</FL>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Título, descrição, solicitante…"
              className="pl-9 h-9"
              defaultValue={current("search")}
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  update("search", (e.target as HTMLInputElement).value || null);
              }}
              onBlur={(e) => {
                const val = e.target.value;
                if (val !== current("search")) update("search", val || null);
              }}
            />
          </div>
        </div>

        {/* Diretor */}
        <div className="w-36">
          <FL>Diretor</FL>
          <Select
            value={current("director") || "_all"}
            onValueChange={(v) => update("director", v === "_all" ? null : v)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos</SelectItem>
              {DIRECTORS.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Área solicitante */}
        <div className="w-52">
          <FL>Área solicitante</FL>
          <Select
            value={current("requesterArea") || "_all"}
            onValueChange={(v) => update("requesterArea", v === "_all" ? null : v)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todas</SelectItem>
              {areas.map((area) => (
                <SelectItem key={area} value={area}>{area}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Responsável (condicional) */}
        {showAssigneeFilter && (
          <div className="w-44">
            <FL>Responsável</FL>
            <div className="relative">
              <UserCheck className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
              <Select
                value={current("assigneeId") || "_all"}
                onValueChange={(v) => update("assigneeId", v === "_all" ? null : v)}
              >
                <SelectTrigger className="h-9 pl-8">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todos</SelectItem>
                  {assignees.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        ({ROLE_LABEL[a.role] ?? a.role})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Criado por */}
        {creators.length > 0 && (
          <div className="w-44">
            <FL>Criado por</FL>
            <Select
              value={current("creatorId") || "_all"}
              onValueChange={(v) => update("creatorId", v === "_all" ? null : v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todos</SelectItem>
                {creators.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Ordenar */}
        <div className="w-36">
          <FL>Ordenar por</FL>
          <Select
            value={current("sortBy") || "priority"}
            onValueChange={(v) => update("sortBy", v === "priority" ? null : v)}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Ações */}
        <div className="flex items-end gap-2 pb-0">
          {showMyDemandsToggle && (
            <Button
              variant={current("onlyMine") === "true" ? "default" : "outline"}
              size="sm"
              className="h-9 whitespace-nowrap"
              onClick={() => update("onlyMine", current("onlyMine") === "true" ? null : "true")}
            >
              Minhas demandas
            </Button>
          )}

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={clearAll}
              disabled={isPending}
            >
              <X className="h-3.5 w-3.5" />
              Limpar
              <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px]">
                {activeCount}
              </Badge>
            </Button>
          )}
        </div>
      </div>

      {/* Divisor */}
      <div className="h-px bg-border" />

      {/* ── Linha 2: filtros de classificação ── */}
      <div className="flex flex-wrap items-end gap-x-3 gap-y-2">

        {/* Prioridade */}
        <div className="w-[126px]">
          <FL>Prioridade</FL>
          <Select
            value={current("priority") || "_all"}
            onValueChange={(v) => update("priority", v === "_all" ? null : v)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todas</SelectItem>
              {PRIORITY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tipo */}
        <div className="w-[148px]">
          <FL>Tipo</FL>
          <Select
            value={current("demandType") || "_all"}
            onValueChange={(v) => update("demandType", v === "_all" ? null : v)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos</SelectItem>
              {TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Complexidade */}
        <div className="w-[126px]">
          <FL>Complexidade</FL>
          <Select
            value={current("complexity") || "_all"}
            onValueChange={(v) => update("complexity", v === "_all" ? null : v)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todas</SelectItem>
              {COMPLEXITY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ROI */}
        <div className="w-[116px]">
          <FL>ROI</FL>
          <Select
            value={current("roi") || "_all"}
            onValueChange={(v) => update("roi", v === "_all" ? null : v)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos</SelectItem>
              {ROI_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Prazo */}
        <div className="w-[136px]">
          <FL>Prazo</FL>
          <Select
            value={current("deadlineStatus") || "_all"}
            onValueChange={(v) => update("deadlineStatus", v === "_all" ? null : v)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos</SelectItem>
              {DEADLINE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Solicitante */}
        <div className="w-44">
          <FL>Solicitante</FL>
          <div className="relative">
            <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Nome do solicitante…"
              className="pl-9 h-9"
              defaultValue={current("requesterName")}
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  update("requesterName", (e.target as HTMLInputElement).value || null);
              }}
              onBlur={(e) => {
                const val = e.target.value;
                if (val !== current("requesterName")) update("requesterName", val || null);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
