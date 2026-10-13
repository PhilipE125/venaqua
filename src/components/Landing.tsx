import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { fmt, useCompanies, useMatches, useWwtps } from "@/lib/queries";
import { normalize, sectorById } from "@/lib/sectors";
import { useApp } from "@/lib/state";

const QUESTIONS = [
  { who: "Plant operator", q: "Who near my plant could use my reclaimed water?", cta: "Open a plant" },
  { who: "Factory manager", q: "Is there reuse-ready water near me, and is it cheaper than my tariff?", cta: "Find my company" },
  { who: "Factory manager, on site", q: "How much could reusing my own water save, compared with a grid solution?", cta: "Compare options" },
  { who: "City or region", q: "Where does our wastewater go, and how stressed is supply?", cta: "Open a comarca" },
] as const;

export function Landing() {
  const { landing, setLanding, select, setSearchOpen } = useApp();
  const { filtered, siteById } = useMatches();
  const w = useWwtps();
  if (!landing) return null;
  const top = filtered[0];
  const go = (i: number) => {
    if (i === 0 && top) select({ kind: siteById.get(top.siteId)!.kind as "wwtp" | "regen", id: top.siteId });
    if (i === 1) {
      setLanding(false);
      setSearchOpen(true);
    }
    if (i === 2 && top) select({ kind: "company", id: top.companyId });
    if (i === 3) {
      const comarca = w.data?.features.find((p) => p.comarca === "Baix Llobregat")?.comarca ?? w.data?.features[0]?.comarca;
      if (comarca) select({ kind: "comarca", id: comarca });
    }
  };
  return (
    <div className="panel absolute left-1/2 top-6 z-20 w-[640px] -translate-x-1/2 rounded-md p-5 shadow-xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="label-caps">Start with a question</p>
          <h2 className="mt-1 text-lg font-semibold">What do you want to know?</h2>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setLanding(false)} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {QUESTIONS.map((x, i) => (
          <button key={x.who} onClick={() => go(i)} className="flex flex-col rounded-sm border bg-background p-3 text-left transition-colors hover:bg-accent disabled:opacity-50" disabled={(i === 0 || i === 2) && !top}>
            <span className="label-caps">{x.who}</span>
            <span className="mt-1.5 flex-1 text-sm leading-snug">{x.q}</span>
            <span className="mt-3 text-xs font-medium underline-offset-2 hover:underline">{x.cta} →</span>
          </button>
        ))}
      </div>
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
