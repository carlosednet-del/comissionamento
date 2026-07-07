"use client";

import { useState, useTransition, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ExecFilters }          from "./exec-filters";
import { ExecKpiCards }         from "./exec-kpi-cards";
import { ExecExportButton }     from "./exec-export-button";
import { ExecTabOverview }      from "./exec-tab-overview";
import { ExecTabCollaborators } from "./exec-tab-collaborators";
import { ExecTabProfile }       from "./exec-tab-profile";
import { ExecTabAreas }         from "./exec-tab-areas";
import { ExecTabDirectors }     from "./exec-tab-directors";
import { ExecTabDemands }       from "./exec-tab-demands";

import { getExecDashboardDataAction } from "@/server/actions/executiveDashboardActions";
import type { ExecDashboardData }     from "@/services/executiveDashboardService";
import type { ExecutiveDashboardFilters } from "@/validations/executive-dashboard";

type Director     = { id: string; name: string; role: string };
type Collaborator = { id: string; name: string; workerProfile: string | null };

type Props = {
  initialData:   ExecDashboardData;
  initialFilters:ExecutiveDashboardFilters;
  directors:     Director[];
  collaborators: Collaborator[];
};

export function ExecDashboardClient({
  initialData,
  initialFilters,
  directors,
  collaborators,
}: Props) {
  const [filters,  setFilters]  = useState<ExecutiveDashboardFilters>(initialFilters);
  const [data,     setData]     = useState<ExecDashboardData>(initialData);
  const [isPending, startTransition] = useTransition();

  const handleFiltersChange = useCallback((newFilters: ExecutiveDashboardFilters) => {
    setFilters(newFilters);
    startTransition(async () => {
      const result = await getExecDashboardDataAction(newFilters);
      if (!result.success) {
        toast.error(result.error ?? "Erro ao carregar dados.");
        return;
      }
      if (result.data) {
        setData(result.data);
      }
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Executivo</h1>
          <p className="text-sm text-muted-foreground">Produtividade e Valor — demandas homologadas em produção</p>
        </div>
        <div className="flex items-center gap-2">
          {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <ExecExportButton filters={filters} />
        </div>
      </div>

      {/* Filtros */}
      <ExecFilters
        filters={filters}
        directors={directors}
        collaborators={collaborators}
        onChange={handleFiltersChange}
        loading={isPending}
      />

      {/* KPIs */}
      <div className={isPending ? "opacity-60 pointer-events-none transition-opacity" : "transition-opacity"}>
        <ExecKpiCards summary={data.summary} />
      </div>

      {/* Tabs */}
      <div className={isPending ? "opacity-60 pointer-events-none transition-opacity" : "transition-opacity"}>
        <Tabs defaultValue="overview">
          <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="collaborators">Colaboradores</TabsTrigger>
            <TabsTrigger value="profile">Perfil Técnico</TabsTrigger>
            <TabsTrigger value="areas">Áreas</TabsTrigger>
            <TabsTrigger value="directors">Diretores</TabsTrigger>
            <TabsTrigger value="demands">Demandas</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <ExecTabOverview monthlySeries={data.monthlySeries} />
          </TabsContent>

          <TabsContent value="collaborators">
            <ExecTabCollaborators
              byCollaborator={data.byCollaborator}
              rankingCollaborators={data.rankingCollaborators}
              collaboratorMonthMatrix={data.collaboratorMonthMatrix}
              allMonths={data.allMonths}
            />
          </TabsContent>

          <TabsContent value="profile">
            <ExecTabProfile
              bySeniority={data.bySeniority}
              bySpecialty={data.bySpecialty}
              byMonthAndSeniority={data.byMonthAndSeniority}
              byMonthAndSpecialty={data.byMonthAndSpecialty}
              collaboratorMonthMatrix={data.collaboratorMonthMatrix}
              allMonths={data.allMonths}
            />
          </TabsContent>

          <TabsContent value="areas">
            <ExecTabAreas
              byArea={data.byArea}
              rankingAreas={data.rankingAreas}
            />
          </TabsContent>

          <TabsContent value="directors">
            <ExecTabDirectors
              byDirector={data.byDirector}
              rankingDirectors={data.rankingDirectors}
            />
          </TabsContent>

          <TabsContent value="demands">
            <ExecTabDemands demands={data.demands} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
