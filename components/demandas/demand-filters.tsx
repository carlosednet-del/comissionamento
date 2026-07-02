"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useTransition } from "react";
import { DemandStatus, DemandPriority, DemandType } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { STATUS_CONFIG } from "./status-badge";
import { PRIORITY_CONFIG } from "./priority-badge";
import { TYPE_CONFIG } from "./type-badge";
import { DEPARTMENTS, DIRECTORS } from "@/lib/constants/departments";

const ALL_PLACEHOLDER = "__ALL__";

export function DemandFilters() {
  const router    = useRouter();
  const pathname  = usePathname();
  const sp        = useSearchParams();
  const [pending, startTransition] = useTransition();

  function get(key: string): string {
    return sp.get(key) ?? "";
  }

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(sp.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page"); // reset to page 1
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, sp],
  );

  function clear() {
    startTransition(() => {
      router.push(pathname);
    });
  }

  const hasFilters = ["search", "status", "priority", "demandType", "requesterArea", "director"].some((k) => sp.has(k));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Busca */}
      <div className="relative min-w-[180px] flex-1 max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          className="pl-8 h-9"
          placeholder="Buscar demanda..."
          defaultValue={get("search")}
          onChange={(e) => {
            const val = e.target.value;
            // debounce via form submit on Enter, or immediate
            update("search", val);
          }}
        />
      </div>

      {/* Status */}
      <Select
        value={get("status") || ALL_PLACEHOLDER}
        onValueChange={(v) => update("status", v === ALL_PLACEHOLDER ? "" : v)}
      >
        <SelectTrigger className="h-9 w-44">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_PLACEHOLDER}>Todos os status</SelectItem>
          {(Object.keys(STATUS_CONFIG) as DemandStatus[]).map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_CONFIG[s].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Prioridade */}
      <Select
        value={get("priority") || ALL_PLACEHOLDER}
        onValueChange={(v) => update("priority", v === ALL_PLACEHOLDER ? "" : v)}
      >
        <SelectTrigger className="h-9 w-36">
          <SelectValue placeholder="Prioridade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_PLACEHOLDER}>Todas as prioridades</SelectItem>
          {(Object.keys(PRIORITY_CONFIG) as DemandPriority[]).map((p) => (
            <SelectItem key={p} value={p}>
              {PRIORITY_CONFIG[p].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Tipo */}
      <Select
        value={get("demandType") || ALL_PLACEHOLDER}
        onValueChange={(v) => update("demandType", v === ALL_PLACEHOLDER ? "" : v)}
      >
        <SelectTrigger className="h-9 w-40">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_PLACEHOLDER}>Todos os tipos</SelectItem>
          {(Object.keys(TYPE_CONFIG) as DemandType[]).map((t) => (
            <SelectItem key={t} value={t}>
              {TYPE_CONFIG[t].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Área solicitante */}
      <Select
        value={get("requesterArea") || ALL_PLACEHOLDER}
        onValueChange={(v) => update("requesterArea", v === ALL_PLACEHOLDER ? "" : v)}
      >
        <SelectTrigger className="h-9 w-44">
          <SelectValue placeholder="Área solicitante" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_PLACEHOLDER}>Todas as áreas</SelectItem>
          {DEPARTMENTS.map((d) => (
            <SelectItem key={d} value={d}>{d}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Diretor responsável */}
      <Select
        value={get("director") || ALL_PLACEHOLDER}
        onValueChange={(v) => update("director", v === ALL_PLACEHOLDER ? "" : v)}
      >
        <SelectTrigger className="h-9 w-44">
          <SelectValue placeholder="Diretor" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_PLACEHOLDER}>Todos os diretores</SelectItem>
          {DIRECTORS.map((d) => (
            <SelectItem key={d} value={d}>{d}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Limpar */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-1 text-muted-foreground"
          onClick={clear}
          disabled={pending}
        >
          <X className="h-3 w-3" />
          Limpar
        </Button>
      )}
    </div>
  );
}
