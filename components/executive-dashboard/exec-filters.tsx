"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEPARTMENTS } from "@/lib/constants/departments";
import { TECHNICAL_SPECIALTIES, SEM_ESPECIALIDADE_FILTER } from "@/lib/constants/specialties";
import type { ExecutiveDashboardFilters } from "@/validations/executive-dashboard";
import { Filter, RotateCcw } from "lucide-react";

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

function FilterLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-medium text-muted-foreground block mb-1">{children}</label>;
}

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
    <Card className="shadow-sm border-0 ring-1 ring-border/60">
      <CardHeader className="pb-3 pt-4 px-5">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          Filtros executivos
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="flex gap-4 items-end">
          {/* Grid de filtros */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
            <div>
              <FilterLabel>Data inicial</FilterLabel>
              <Input
                type="date"
                value={filters.startDate ?? ""}
                onChange={(e) => set({ startDate: e.target.value || undefined })}
                disabled={loading}
                className="h-9 text-sm"
              />
            </div>

            <div>
              <FilterLabel>Data final</FilterLabel>
              <Input
                type="date"
                value={filters.endDate ?? ""}
                onChange={(e) => set({ endDate: e.target.value || undefined })}
                disabled={loading}
                className="h-9 text-sm"
              />
            </div>

            <div>
              <FilterLabel>Colaborador</FilterLabel>
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

            <div>
              <FilterLabel>Senioridade</FilterLabel>
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

            <div>
              <FilterLabel>Especialidade</FilterLabel>
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

            <div>
              <FilterLabel>Área</FilterLabel>
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

            <div>
              <FilterLabel>Diretor</FilterLabel>
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

            <div>
              <FilterLabel>Tipo</FilterLabel>
              <Select value={val(filters.demandType)} onValueChange={(v) => set({ demandType: opt(v) as ExecutiveDashboardFilters["demandType"] })} disabled={loading}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Todos</SelectItem>
                  {DEMAND_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <FilterLabel>Complexidade</FilterLabel>
              <Select value={val(filters.complexity)} onValueChange={(v) => set({ complexity: opt(v) as ExecutiveDashboardFilters["complexity"] })} disabled={loading}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Todas</SelectItem>
                  {COMPLEXITY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <FilterLabel>ROI</FilterLabel>
              <Select value={val(filters.roi)} onValueChange={(v) => set({ roi: opt(v) as ExecutiveDashboardFilters["roi"] })} disabled={loading}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Todos</SelectItem>
                  {ROI_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Botões */}
          <div className="flex flex-col gap-2 shrink-0">
            <Button
              size="sm"
              className="h-9 px-4 text-sm gap-1.5 bg-[#007EB5] hover:bg-[#006499] text-white"
              disabled={loading}
              onClick={() => onChange({ ...filters })}
            >
              <Filter className="h-3.5 w-3.5" />
              Aplicar filtros
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 text-sm gap-1.5"
              onClick={reset}
              disabled={loading}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Limpar filtros
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
