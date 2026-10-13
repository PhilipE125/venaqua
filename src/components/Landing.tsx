import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useCompanies, useMatches, useWwtps } from "@/lib/queries";
import { sectorById } from "@/lib/sectors";
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
  return (
    <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
      <CommandInput placeholder="Search a company or municipality…" />
      <CommandList>
        <CommandEmpty>No company found.</CommandEmpty>
        <CommandGroup heading="Companies">
          {(c.data?.features ?? []).slice(0, 15000).map((x) => (
            <CommandItem
              key={x.id}
              value={`${x.name} ${x.municipi} ${x.id}`}
              onSelect={() => {
                setSearchOpen(false);
                select({ kind: "company", id: x.id });
              }}
            >
              <span className="truncate">{x.name}</span>
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">{x.municipi} · {sectorById[x.sector].label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
