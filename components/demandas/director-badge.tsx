import { AREA_DIRECTOR_MAP } from "@/lib/constants/departments";
import { cn } from "@/lib/utils";

const DIRECTOR_STYLE: Record<string, string> = {
  Gabriel: "bg-blue-50 text-blue-700 border-blue-200",
  Lucelia: "bg-violet-50 text-violet-700 border-violet-200",
  Marco:   "bg-teal-50 text-teal-700 border-teal-200",
};

type Props = { requesterArea: string | null | undefined; className?: string };

export function DirectorBadge({ requesterArea, className }: Props) {
  const director = requesterArea ? AREA_DIRECTOR_MAP[requesterArea] : undefined;
  if (!director) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
        DIRECTOR_STYLE[director] ?? "bg-slate-50 text-slate-600 border-slate-200",
        className,
      )}
    >
      {director}
    </span>
  );
}
