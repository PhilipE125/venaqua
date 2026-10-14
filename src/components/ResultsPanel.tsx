import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fmt, fmt2, useClusters, useFlipTable, useMatches } from "@/lib/queries";
import { useApp } from "@/lib/state";
import { MODULES } from "./ModuleBar";

const REGION_NAME = { es: "Spain", cat: "Catalonia", fr: "France", de: "Germany" } as const;

function flipLabel(y: number | null) {
  return y == null ? "Not by 2050" : y <= 2026 ? "Cheaper now" : `Flips ${y}`;
}

// Headline output: reuse projects ranked by cost per m³ vs the alternative, with the year the math flips.
export function ResultsPanel() {
  const { mode, selection, select, region } = useApp();
  const { rows, isLoading, isError } = useFlipTable();
  const clusters = useClusters();
  const { siteById } = useMatches();
  const [open, setOpen] = useState(true);
  const module = MODULES.find(m => m.mode === mode);

  const list = useMemo(() => {
    if (!rows) return null;
    // Module 1 = buyers a plant connection serves; 3 = own facility vs connection; others use the overall ranking.
    if (mode === "q1") return rows.filter(r => r.option === "B");
    return rows;
  }, [rows, mode]);

  if (selection && selection.kind !== "region") return null;
  const early = rows?.filter(r => r.flipYear != null && r.flipYear < 2035).length ?? 0;

  return (
    <aside className="results-panel panel flex flex-col overflow-hidden rounded-lg">
      <button className="flex items-start justify-between gap-2 px-4 pb-2 pt-3 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>
          <span className="label-caps block">{module ? `Module ${module.n} · ${module.title}` : "Ranked projects"}</span>
          <span className="mt-0.5 block text-sm font-semibold">{mode === "q4" ? "Shared pipes by cost per m³" : "Cost per m³ vs the alternative"}</span>
          {rows && <span className="tnum mt-0.5 block text-[11px] text-muted-foreground">{fmt.format(rows.length)} sites screened in {REGION_NAME[region]} · <span className="font-medium text-flip">{fmt.format(early)} flip before 2035</span><span className="block">Straight-line distance; open a site for the road route.</span></span>}
        </span>
        {open ? <ChevronUp className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>
      {open && <div className="min-h-0 flex-1 overflow-y-auto border-t px-2 py-2">
        {mode === "q4" ? (
          clusters.length ? <ol className="space-y-1">{clusters.slice(0, 30).map((c, i) => {
            const plant = siteById.get(c.plantId);
            return <li key={c.plantId} className="rounded-md px-2 py-2 hover:bg-muted">
              <div className="flex items-baseline justify-between gap-2 text-xs"><span className="truncate font-medium"><span className="tnum mr-1.5 text-muted-foreground">{i + 1}</span>{plant?.name ?? "Treatment plant"}</span><span className="tnum shrink-0 font-semibold text-flip">€{fmt2.format(c.costPerM3[0])}-{fmt2.format(c.costPerM3[1])}/m³</span></div>
              <div className="mt-0.5 text-[11px] text-muted-foreground"><span className="tnum">{c.companyIds.length}</span> companies share one pipe · <span className="tnum">{fmt.format(c.delivered)} m³/day</span> · <span className="tnum">{fmt.format(c.trunkKm + c.spurKm)} km</span> · estimate</div>
              {plant && <Button size="sm" variant="link" className="h-6 px-0 text-xs" onClick={() => select({ kind: plant.kind, id: plant.id })}>Open cost-benefit</Button>}
            </li>;
          })}</ol> : <p className="p-3 text-xs text-muted-foreground">No shared-pipe groups found within the current distance.</p>
        ) : isError ? (
          <p role="alert" className="p-3 text-xs text-muted-foreground">Couldn't load the companies or treatment plants. Check your connection and reload the page.</p>
        ) : isLoading || !list ? (
          <div className="space-y-2 p-1">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : (
          <ol className="space-y-1">
            {list.slice(0, 50).map((r, i) => (
              <li key={r.company.id} className="rounded-md px-2 py-2 hover:bg-muted">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="truncate font-medium"><span className="tnum mr-1.5 text-muted-foreground">{i + 1}</span>{r.company.name}</span>
                  <span className="tnum shrink-0 text-sm font-semibold text-flip">{flipLabel(r.flipYear)}{r.flipYear != null && r.flipYear <= 2026 ? (r.option === "B" ? " · connect" : " · own plant") : ""}</span>
                </div>
                <div className="mt-0.5 flex justify-between gap-2 text-[11px] text-muted-foreground">
                  <span className="truncate">{r.option === "B" ? `Connect to ${r.plant}` : "Own reuse facility"}</span>
                  {mode === "q3" ? (
                    <span className="tnum shrink-0">
                      <span className={r.connect == null || r.own <= r.connect ? "font-medium text-flip" : ""}>Own €{fmt2.format(r.own)}</span>
                      {r.connect != null && <> · <span className={r.connect < r.own ? "font-medium text-flip" : ""}>Connect €{fmt2.format(r.connect)}</span></>}
                    </span>
                  ) : <span className="tnum shrink-0">€{fmt2.format(r.perM3)} vs €{fmt2.format(r.statusQuo)} per m³</span>}
                </div>
                <Button size="sm" variant="link" className="h-6 px-0 text-xs" onClick={() => select({ kind: "company", id: r.company.id })}>Open cost-benefit</Button>
              </li>
            ))}
          </ol>
        )}
        <p className="px-2 pb-1 pt-2 text-[10px] leading-snug text-muted-foreground">Screening with default inputs and tariffs rising 3% a year; estimates, not quotes.</p>
      </div>}
    </aside>
  );
}
