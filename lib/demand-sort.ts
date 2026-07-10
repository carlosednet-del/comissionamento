import { AREA_DIRECTOR_MAP } from "@/lib/constants/departments";

// Gabriel=0, Lucelia=1, Marco=2 — define a ordem entre os diretores
const DIRECTOR_ORDER: Record<string, number> = { Gabriel: 0, Lucelia: 1, Marco: 2 };

type Sortable = {
  requesterArea:        string | null | undefined;
  directorPriorityOrder: number | null | undefined;
};

export function compareByDirectorPriority(a: Sortable, b: Sortable): number {
  const dA = a.requesterArea ? AREA_DIRECTOR_MAP[a.requesterArea] : undefined;
  const dB = b.requesterArea ? AREA_DIRECTOR_MAP[b.requesterArea] : undefined;
  const sA = dA !== undefined ? (DIRECTOR_ORDER[dA] ?? 99) : 99;
  const sB = dB !== undefined ? (DIRECTOR_ORDER[dB] ?? 99) : 99;
  if (sA !== sB) return sA - sB;
  // dentro do mesmo diretor: ordena por prioridade atribuída (nulls por último)
  const pA = a.directorPriorityOrder ?? Infinity;
  const pB = b.directorPriorityOrder ?? Infinity;
  return pA - pB;
}
