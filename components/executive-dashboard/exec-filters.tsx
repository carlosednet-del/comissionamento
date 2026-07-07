"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { DEPARTMENTS } from "@/lib/constants/departments";
import { TECHNICAL_SPECIALTIES, SEM_ESPECIALIDADE_FILTER } from "@/lib/constants/specialties";
import type { ExecutiveDashboardFilters } from "@/validations/executive-dashboard";
import { X } from "lucide-react";

type Director     = { id: string; name: string; role: string };
type Collaborator = { id: string; name: string; workerProfile: string | null };

type Props = {
  filters:       ExecutiveDashboardFilters;
  directors:     Director[];
  collaborators: Collaborator[];
  onChange:      (f: ExecutiveDashboardFilters) => void;
  loading?:      boolean;
};

const COMPLEXITY_OPTIONS = [
  { value: "BAIXA",   label: "Baixa"   },
  { value: "MEDIA",   label: "Média"   },
  { value: "ALTA",    label: "Alta"    },
  { value: "CRITICA", label: "Crítica" },
];

const ROI_OPTIONS = [
  { value: "BAIXO",       label: "Baixo"       },
  { value: "MEDIO",       label: "Médio"       },
  { value: "ALTO",        label: "Alto"        },
  { value: "ESTRATEGICO", label: "Estratégico" },
];

const SENIORITY_OPTIONS = [
  { value: "JUNIOR",       label: "Júnior"       },
  { value: "PLENO",        label: "Pleno"        },
  { value: "SENIOR",       label: "Sênior"       },
  { value: "ESPECIALISTA", label: "Especialista" },
];

const DEMAND_TYPE_OPTIONS = [
  { value: "NOVA_SOLUCAO",      label: "Nova Solução" },
  { value: "EVOLUCAO_PRODUCAO", label: "Evolução"     },
  { value: "CORRECAO",          label: "Correção"     },
  { value: "AUTOMACAO",         label: "Automação"    },
  { value: "DASHBOARD",         label: "Dashboard"    },
  { value: "INTEGRACAO",        label: "Integração"   },
  { value: "OUTRO",             label: "Outro"        },
];

const NONE = "__ALL__";

function val(v: string | undefined): string { return v ?? NONE; }
function opt(v: string): string | undefined { return v === NONE ? undefined : v; }

export function ExecFilters({ filters, directors, collaborators, onChange, loading }: Props) {
  function set(patch: Partial<ExecutiveDashboardFilters>) {
    onChange({ ...filters, ...patch });
  }

  function reset() {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const end   = today.toISOString().slice(0, 10);
    onChange({ startDate: start, endDate: end, homologatedOnly: true });
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">

        {/* Período */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">De</label>
          <Input
            type="date"
            value={filters.startDate ?? ""}
            onChange={(e) => set({ startDate: e.target.value || undefined })}
            disabled={loading}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Até</label>
          <Input
            type="date"
            value={filters.endDate ?? ""}
            onChange={(e) => set({ endDate: e.target.value || undefined })}
            disabled={loading}
            className="h-9 text-sm"
          />
        </div>

        {/* Colaborador */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Colaborador</label>
          <Select value={val(filters.collaboratorId)} onValueChange={(v) => set({ collaboratorId: opt(v) })} disabled={loading}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Todos</SelectItem>
              {collaborators.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Área */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Área</label>
          <Select value={val(filters.requesterArea)} onValueChange={(v) => set({ requesterArea: opt(v) })} disabled={loading}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Todas</SelectItem>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Diretor */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Diretor</label>
          <Select value={val(filters.directorId)} onValueChange={(v) => set({ directorId: opt(v) })} disabled={loading}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Todos</SelectItem>
              <SelectItem value="SEM_DIRETOR">Sem Diretor</SelectItem>
              {directors.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Senioridade */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Senioridade</label>
          <Select
            value={val(filters.workerProfile)}
            onValueChange={(v) => set({ workerProfile: opt(v) as ExecutiveDashboardFilters["workerProfile"] })}
            disabled={loading}
          >
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Todas</SelectItem>
              {SENIORITY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Especialidade */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Especialidade</label>
          <Select value={val(filters.specialty)} onValueChange={(v) => set({ specialty: opt(v) })} disabled={loading}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Todas</SelectItem>
              <SelectItem value={SEM_ESPECIALIDADE_FILTER}>Sem especialidade</SelectItem>
              {TECHNICAL_SPECIALTIES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tipo */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Tipo</label>
          <Select value={val(filters.demandType)} onValueChange={(v) => set({ demandType: opt(v) as ExecutiveDashboardFilters["demandType"] })} disabled={loading}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Todos</SelectItem>
              {DEMAND_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Complexidade */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Complexidade</label>
          <Select value={val(filters.complexity)} onValueChange={(v) => set({ complexity: opt(v) as ExecutiveDashboardFilters["complexity"] })} disabled={loading}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Todas</SelectItem>
              {COMPLEXITY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* ROI */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">ROI</label>
          <Select value={val(filters.roi)} onValueChange={(v) => set({ roi: opt(v) as ExecutiveDashboardFilters["roi"] })} disabled={loading}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Todos</SelectItem>
              {ROI_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Reset */}
        <div className="space-y-1 flex flex-col justify-end">
          <label className="text-xs font-medium text-muted-foreground opacity-0 select-none">.</label>
          <Button variant="outline" size="sm" onClick={reset} disabled={loading} className="h-9 gap-1.5 text-sm">
            <X className="h-3.5 w-3.5" />
            Limpar
          </Button>
        </div>
      </div>
    </div>
  );
}
