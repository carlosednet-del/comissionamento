"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DemandSummary } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";
import { PriorityBadge } from "./priority-badge";
import { TypeBadge } from "./type-badge";
import { Eye, ChevronLeft, ChevronRight } from "lucide-react";
const DATE_FMT = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

type Props = {
  demands:    DemandSummary[];
  total:      number;
  page:       number;
  pageSize:   number;
  totalPages: number;
};

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return "—";
  return DATE_FMT.format(date);
}

export function DemandTable({ demands, total, page, pageSize, totalPages }: Props) {
  const router = useRouter();

  function goPage(p: number) {
    const sp = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    sp.set("page", String(p));
    router.push(`?${sp.toString()}`);
  }

  if (demands.length === 0) {
    return (
      <div className="rounded-lg border bg-card py-16 text-center">
        <p className="text-muted-foreground text-sm">Nenhuma demanda encontrada.</p>
        <p className="text-muted-foreground text-xs mt-1">Tente ajustar os filtros ou crie uma nova demanda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-[30%]">Título</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Entrega prevista</TableHead>
              <TableHead className="w-12 text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {demands.map((d) => (
              <TableRow key={d.id} className="hover:bg-muted/30 transition-colors">
                <TableCell>
                  <div className="font-medium leading-snug line-clamp-2">{d.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{d.requesterArea}</div>
                </TableCell>
                <TableCell>
                  <TypeBadge type={d.demandType} />
                </TableCell>
                <TableCell>
                  <PriorityBadge priority={d.priority} showIcon />
                </TableCell>
                <TableCell>
                  <StatusBadge status={d.status} />
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {d.assignee?.name ?? <span className="text-muted-foreground italic">Sem responsável</span>}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm tabular-nums">
                    {fmtDate(d.plannedDeliveryDate)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                    <Link href={`/demandas/${d.id}`}>
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">Ver demanda</span>
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            Exibindo {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total} demandas
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => goPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => goPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
