import { createContext, useContext, type ReactNode } from "react";
import { FACTS, type FactId, type ModuleStatus } from "@/content/venaqua";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const SourcesCtx = createContext<FactId[]>([]);

/** Wrap a page; `ids` sets the order of the numbered Sources list. */
export function SourcesProvider({ ids, children }: { ids: FactId[]; children: ReactNode }) {
  return (
    <SourcesCtx.Provider value={ids}>
      <TooltipProvider delayDuration={150}>{children}</TooltipProvider>
    </SourcesCtx.Provider>
  );
}

export function SourceNote({ id }: { id: FactId }) {
  const ids = useContext(SourcesCtx);
  const n = ids.indexOf(id) + 1;
  if (!n) return null;
  return (
    <sup className="ml-0.5 text-[0.65em] font-normal text-muted-foreground">
      <a href={`#source-${id}`} className="hover:text-foreground">{n}</a>
    </sup>
  );
}

/** A fact value with its source note and an "Estimate" label when relevant. */
export function FactValue({ id, className }: { id: FactId; className?: string }) {
  const f = FACTS[id];
  return (
    <span className={className}>
      {f.value}
      <SourceNote id={id} />
      {"estimate" in f && f.estimate && (
        <span className="ml-1.5 rounded border px-1 py-0.5 align-middle text-[10px] font-normal text-muted-foreground">Estimate</span>
      )}
    </span>
  );
}

export function SourcesList() {
  const ids = useContext(SourcesCtx);
  if (!ids.length) return null;
  return (
    <section id="sources" className="border-t border-border/60 bg-background/80">
      <div className="mx-auto w-full max-w-5xl px-5 py-10">
        <p className="label-caps text-muted-foreground">Sources</p>
        <ol className="mt-3 grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
          {ids.map((id, i) => {
            const f = FACTS[id];
            const url = "url" in f ? f.url : undefined;
            const year = "year" in f ? f.year : undefined;
            return (
              <li key={id} id={`source-${id}`} className="flex gap-2">
                <span className="tabular-nums">{i + 1}.</span>
                <span>
                  {url ? <a href={url} target="_blank" rel="noreferrer" className="underline">{f.source}</a> : f.source}
                  {year ? `, ${year}` : ""} — {f.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

const STATUS: Record<ModuleStatus, { label: string; tip: string; cls: string }> = {
  live: { label: "Live", tip: "In the product today.", cls: "border-primary bg-primary text-primary-foreground" },
  beta: { label: "Beta", tip: "Works today, still being refined.", cls: "border-primary text-primary" },
  "on-request": { label: "On request", tip: "Set up for your team on request.", cls: "border-border text-muted-foreground" },
  coming: { label: "Coming soon", tip: "Planned, not yet available.", cls: "border-dashed border-muted-foreground/50 text-muted-foreground" },
};

export function StatusBadge({ status, className }: { status: ModuleStatus; className?: string }) {
  const s = STATUS[status];
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className={cn("inline-flex shrink-0 cursor-default items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium", s.cls, className)}>
            {s.label}
          </span>
        </TooltipTrigger>
        <TooltipContent>{s.tip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Small inline "Source · year" note shown next to a fact. */
export function SourceCaption({ id }: { id: FactId }) {
  const f = FACTS[id];
  const year = "year" in f ? f.year : undefined;
  return <p className="mt-2 text-[11px] text-muted-foreground/80">Source: {f.source}{year ? ` · ${year}` : ""}</p>;
}
