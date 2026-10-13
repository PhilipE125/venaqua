import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { META, type Quality, type SourceId } from "@/lib/sources/contract";
import { cn } from "@/lib/utils";

export function QualityBadge({ q, className }: { q: Quality | "estimate" | "your figure"; className?: string }) {
  // Evidence language: solid = measured, dashed = modelled, dotted = assumption/estimate.
  const style =
    q === "measured" || q === "your figure"
      ? "border-solid"
      : q === "modelled"
        ? "border-dashed"
        : "border-dotted";
  return (
    <Badge
      variant="outline"
      className={cn("h-4 shrink-0 border-[1.5px] px-1.5 text-[10px] font-normal text-muted-foreground", style, className)}
    >
      {q}
    </Badge>
  );
}

export function SourceInfo({
  id,
  quality,
  date,
  note,
}: {
  id: SourceId;
  quality?: Quality | undefined;
  date?: string | undefined;
  note?: string | undefined;
}) {
  const m = META[id];
  const q = quality ?? m.quality;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Source: ${m.name}`}
          className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center align-middle text-muted-foreground hover:text-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <Info className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 text-xs" side="left" align="start">
        <div className="flex items-start justify-between gap-2">
          <a href={m.url} target="_blank" rel="noreferrer" className="font-medium hover:text-primary">
            {m.name}
          </a>
          <QualityBadge q={q} />
        </div>
        <p className="mt-1 text-muted-foreground">{m.publisher}</p>
        <p className="mt-1.5">{m.unitNotes}</p>
        {note && <p className="mt-1.5 text-muted-foreground">{note}</p>}
        <div className="mt-2 grid grid-cols-2 gap-1 border-t pt-2">
          <span className="label-caps">Updated</span>
          <span className="tnum text-right">{m.updateFrequency}</span>
          {date && (
            <>
              <span className="label-caps">Data date</span>
              <span className="tnum text-right">{date}</span>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
