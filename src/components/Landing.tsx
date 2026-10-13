import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { fmt, useCompanies, useMatches } from "@/lib/queries";
import { normalize, sectorById } from "@/lib/sectors";
import { QUESTIONS, useApp, type Mode } from "@/lib/state";

export function QuestionBar() {
  const { mode, setMode, select, selection, setSearchOpen, tip, dismissTip } = useApp();
  const { filtered, siteById } = useMatches();
  const pick = (m: Mode) => {
    setMode(m);
    if (m === "q1") {
      const top = filtered[0];
      if (top && selection?.kind !== "wwtp" && selection?.kind !== "regen") select({ kind: siteById.get(top.siteId)!.kind as "wwtp" | "regen", id: top.siteId });
    } else if (m === "q4") select({ kind: "region", id: "catalonia" });
    else if (m !== "all" && selection?.kind !== "company") setSearchOpen(true);
  };
  const active = QUESTIONS.find((q) => q.mode === mode);
  return (
    <div className="relative z-30 shrink-0">
      <div className="panel flex items-center gap-3 border-x-0 border-t-0 px-3 py-1.5">
        <span className="label-caps shrink-0">Your question</span>
      <div className="flex flex-wrap items-stretch gap-1">
        {QUESTIONS.map((q, i) => (
          <button
            key={q.mode}
            onClick={() => pick(q.mode)}
            className={`flex flex-col rounded-sm px-2.5 py-1.5 text-left transition-colors ${mode === q.mode ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
          >
            <span className={`text-[10px] uppercase tracking-wide ${mode === q.mode ? "opacity-80" : "text-muted-foreground"}`}>{i + 1} · {q.who}</span>
            <span className="text-xs font-medium">{q.short}</span>
          </button>
        ))}
        <button
          onClick={() => pick("all")}
          className={`rounded-sm px-2.5 py-1.5 text-xs ${mode === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
        >
          Explore everything
        </button>
      </div>
      {active && <p className="hidden min-w-0 flex-1 truncate text-xs text-muted-foreground xl:block">“{active.q}”</p>}
      </div>
      {tip && (
        <div className="panel absolute left-[392px] top-full mt-2 flex max-w-[560px] items-start gap-3 rounded-md p-3 text-xs shadow-md">
          <ol className="flex-1 list-inside list-decimal space-y-0.5">
            <li>Pick the question that matches your role above.</li>
            <li>Click a plant or a company on the map, or use “Find a company”.</li>
            <li>Read the answer at the top of the panel on the right; details open below it.</li>
          </ol>
          <Button size="sm" className="h-7 text-xs" onClick={dismissTip}>Got it</Button>
        </div>
      )}
    </div>
  );
}

export function CompanySearch() {
  const { searchOpen, setSearchOpen, select } = useApp();
  const c = useCompanies();
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const k = normalize(q);
    if (k.length < 2) return [];
    return (c.data?.features ?? []).filter((x) => normalize(`${x.name} ${x.municipi}`).includes(k)).slice(0, 40);
  }, [q, c.data]);
  return (
    <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
      <DialogContent className="max-w-lg gap-0 p-0">
        <DialogTitle className="sr-only">Find a company</DialogTitle>
        <div className="border-b p-3">
          <Input autoFocus placeholder="Search a company or municipality…" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 text-sm" />
        </div>
        <ul className="max-h-[360px] overflow-y-auto p-1.5">
          {q.length >= 2 && results.length === 0 && <li className="px-2 py-3 text-xs text-muted-foreground">No company found.</li>}
          {q.length < 2 && <li className="px-2 py-3 text-xs text-muted-foreground">{c.isLoading ? "Loading companies…" : `Type at least two letters. ${fmt.format(c.data?.features.length ?? 0)} companies.`}</li>}
          {results.map((x) => (
            <li key={x.id}>
              <button
                className="flex w-full items-baseline gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent"
                onClick={() => {
                  setSearchOpen(false);
                  select({ kind: "company", id: x.id });
                }}
              >
                <span className="truncate">{x.name}</span>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">{x.municipi} · {sectorById[x.sector].label}</span>
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
