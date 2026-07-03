"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { ExecDemandRow } from "@/services/executiveDashboardService";
import { Search } from "lucide-react";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const NUM = new Intl.NumberFormat("pt-BR");

const DEMAND_TYPE_LABEL: Record<string, string> = {
  NOVA_SOLUCAO:       "Nova Solução",
  EVOLUCAO_PRODUCAO:  "Evolução",
  CORRECAO:           "Correção",
  AUTOMACAO:          "Automação",
  DASHBOARD:          "Dashboard",
  INTEGRACAO:         "Integração",
  OUTRO:              "Outro",
};

const COMPLEXITY_LABEL: Record<string, string> = {
  BAIXA:   "Baixa",
  MEDIA:   "Média",
  ALTA:    "Alta",
  CRITICA: "Crítica",
};

const COMPLEXITY_CLASS: Record<string, string> = {
  BAIXA:   "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  MEDIA:   "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  ALTA:    "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  CRITICA: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

export function ExecTabDemands({ demands }: { demands: ExecDemandRow[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return demands;
    const q = search.toLowerCase();
    return demands.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.requesterArea.toLowerCase().includes(q) ||
        (d.assigneeName?.toLowerCase().includes(q) ?? false) ||
        (d.directorName?.toLowerCase().includes(q) ?? false),
    );
  }, [demands, search]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="text-sm font-semibold">
          Demandas ({NUM.format(filtered.length)}{filtered.length !== demands.length ? ` de ${NUM.format(demands.length)}` : ""})
        </CardTitle>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="min-w-[200px]">Título</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Colaborador</TableHead>
                <TableHead>Diretor</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Compl.</TableHead>
                <TableHead className="text-right">Horas</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Economia</TableHead>
                <TableHead>Homologação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center text-muted-foreground text-sm">
                    Nenhuma demanda encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium text-sm max-w-[220px]">
                      <span className="line-clamp-2">{d.title}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{d.requesterArea}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{d.assigneeName ?? "—"}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{d.directorName ?? "—"}</TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline">{DEMAND_TYPE_LABEL[d.demandType] ?? d.demandType}</Badge>
                    </TableCell>
                    <TableCell>
                      {d.complexity ? (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${COMPLEXITY_CLASS[d.complexity] ?? ""}`}>
                          {COMPLEXITY_LABEL[d.complexity] ?? d.complexity}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm">{NUM.format(Math.round(d.estimatedHours))}h</TableCell>
                    <TableCell className="text-right text-sm">{BRL.format(d.estimatedDemandValue)}</TableCell>
                    <TableCell className="text-right text-sm text-emerald-600 dark:text-emerald-400">{BRL.format(d.economy)}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                      {d.homologationDate
                        ? new Date(d.homologationDate).toLocaleDateString("pt-BR")
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
