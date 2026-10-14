import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { META, type Quality, type SourceId } from "@/lib/sources/contract";
import { cn } from "@/lib/utils";

type Q = Quality | "estimate" | "your figure";

const QUALITY_LABEL: Record<string, string> = {
  measured: "Measured",
  modelled: "Modelled",
  assumption: "Our estimate",
  estimate: "Our estimate",
  "your figure": "Your figure",
};
const QUALITY_HINT: Record<string, string> = {
  measured: "Reported by a public body from real readings.",
  modelled: "Calculated by a model from measured inputs.",
  assumption: "A placeholder or benchmark we chose; replace it if you know better.",
  estimate: "A placeholder or benchmark we chose; replace it if you know better.",
  "your figure": "A number you entered.",
};

// Evidence language: solid = measured, dashed = modelled, dotted = assumption/estimate.
export const qualityStyle = (q: Q) => (q === "measured" || q === "your figure" ? "solid" : q === "modelled" ? "dashed" : "dotted");

export function QualityBadge({ q, className }: { q: Q; className?: string }) {
  const s = qualityStyle(q);
  return (
    <Badge
      variant="outline"
      title={QUALITY_HINT[q]}
      className={cn("h-4 shrink-0 border-[1.5px] px-1.5 text-[10px] font-normal text-muted-foreground", s === "solid" ? "border-solid" : s === "dashed" ? "border-dashed" : "border-dotted", className)}
    >
      {QUALITY_LABEL[q]}
    </Badge>
  );
}

function SourceCard({ id, q, date, note }: { id: SourceId; q: Q; date?: string | undefined; note?: string | undefined }) {
  const m = META[id];
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <a href={m.url} target="_blank" rel="noreferrer" className="font-medium hover:text-primary">{m.name}</a>
        <QualityBadge q={q} />
      </div>
      <p className="mt-1 text-muted-foreground">{m.publisher}</p>
      <p className="mt-1.5">{m.unitNotes}</p>
      {note && <p className="mt-1.5 text-muted-foreground">{note}</p>}
      <div className="mt-2 grid grid-cols-2 gap-1 border-t pt-2">
        <span className="label-caps">Updated</span>
        <span className="tnum text-right">{m.updateFrequency}</span>
        {date && (<><span className="label-caps">Data date</span><span className="tnum text-right">{date}</span></>)}
      </div>
    </>
  );
}

export function SourceInfo({ id, quality, date, note }: { id: SourceId; quality?: Quality | undefined; date?: string | undefined; note?: string | undefined }) {
  const m = META[id];
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
        <SourceCard id={id} q={quality ?? m.quality} date={date} note={note} />
      </PopoverContent>
    </Popover>
  );
}

/** A number underlined in its evidence style; hover names the quality, click opens the source. */
export function Figure({ value, quality, source, why, className }: { value: React.ReactNode; quality: Q; source: SourceId; why?: string; className?: string }) {
  const s = qualityStyle(quality);
  return (
    <TooltipProvider delayDuration={200}>
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "tnum cursor-help underline decoration-muted-foreground/70 decoration-[1.5px] underline-offset-[3px] hover:decoration-foreground",
                  s === "solid" ? "decoration-solid" : s === "dashed" ? "decoration-dashed" : "decoration-dotted",
                  className,
                )}
              >
                {value}
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent className="max-w-60 text-xs"><span className="font-medium">{QUALITY_LABEL[quality]}.</span> {why ?? QUALITY_HINT[quality]}</TooltipContent>
        </Tooltip>
        <PopoverContent className="w-72 p-3 text-xs" side="left" align="start">
          <SourceCard id={source} q={quality} note={why} />
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}
