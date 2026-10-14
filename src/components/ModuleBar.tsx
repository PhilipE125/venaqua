import { useState } from "react";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useMatches } from "@/lib/queries";
import { useApp, type Mode } from "@/lib/state";

// The deck's five modules, mapped onto the existing question modes q1–q5.
export const MODULES: { mode: Exclude<Mode, "all">; n: number; title: string; sub: string }[] = [
  { mode: "q5", n: 1, title: "Future water costs", sub: "site-specific drought scenarios" },
  { mode: "q3", n: 2, title: "Connect or build", sub: "your own water reuse system" },
  { mode: "q4", n: 3, title: "Share cost", sub: "with neighbours" },
  { mode: "q1", n: 4, title: "Find buyers", sub: "for reusable treated water" },
  { mode: "q2", n: 5, title: "Find supply", sub: "for reusable treated water" },
];

export function useModulePicker() {
  const { mode, setMode, select, selection, setSearchOpen } = useApp();
  const { filtered, siteById } = useMatches();
  return (m: Exclude<Mode, "all">) => {
    if (mode === m) { setMode("all"); return; }
    setMode(m);
    if (m === "q1") { const top = filtered[0]; const site = top ? siteById.get(top.siteId) : undefined; if (site) select({ kind: site.kind, id: site.id }); }
    else if (m === "q2" && selection?.kind !== "company") setSearchOpen(true);
    else if (m !== "q2") select(null);
  };
}

export function ModuleBar() {
  const { mode, panelOpen, selection } = useApp();
  const pick = useModulePicker();
  const sourcing = selection?.kind === "company"; // the company panel needs the map clear
  const [userCollapsed, setUserCollapsed] = useState(false);
  const collapsed = userCollapsed || panelOpen || sourcing;
  return <>
    {/* Desktop: vertical numbered list */}
    <nav aria-label="Modules" className="panel pointer-events-auto absolute left-5 top-4 z-20 hidden rounded-lg p-1.5 shadow-map-panel md:block">
      {!collapsed && <p className="label-caps px-2 pb-1 pt-1">Five modules</p>}
      <ol className="space-y-0.5">
        {MODULES.map(m => {
          const active = mode === m.mode;
          const btn = <button onClick={() => pick(m.mode)} aria-pressed={active} className={`flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted ${active ? "bg-muted" : ""}`}>
            <span className={`tnum mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${active ? "bg-flip text-flip-foreground" : "border text-muted-foreground"}`}>{m.n}</span>
            {!collapsed && <span className="w-44"><span className="block text-xs font-medium">{m.title}</span><span className="block text-[11px] leading-snug text-muted-foreground">{m.sub}</span></span>}
          </button>;
          return <li key={m.mode}>{collapsed ? <Tooltip><TooltipTrigger asChild>{btn}</TooltipTrigger><TooltipContent side="right">{m.title}: {m.sub}</TooltipContent></Tooltip> : btn}</li>;
        })}
      </ol>
      {!panelOpen && <button onClick={() => setUserCollapsed(!userCollapsed)} aria-label={collapsed ? "Expand modules" : "Collapse modules"} className="mt-1 flex w-full justify-center rounded-md py-1 text-muted-foreground hover:bg-muted hover:text-foreground">{collapsed ? <ChevronsRight className="h-3.5 w-3.5" /> : <ChevronsLeft className="h-3.5 w-3.5" />}</button>}
    </nav>
    {/* Mobile: horizontal numbered chips */}
    <nav aria-label="Modules" className="pointer-events-auto absolute left-2 right-2 top-2 z-20 flex gap-1.5 overflow-x-auto md:hidden">
      {MODULES.map(m => {
        const active = mode === m.mode;
        return <button key={m.mode} onClick={() => pick(m.mode)} aria-pressed={active} className={`panel flex shrink-0 items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-xs shadow-map-panel ${active ? "font-medium" : ""}`}>
          <span className={`tnum grid h-5 w-5 place-items-center rounded-full text-[11px] font-semibold ${active ? "bg-flip text-flip-foreground" : "border text-muted-foreground"}`}>{m.n}</span>{m.title}
        </button>;
      })}
    </nav>
  </>;
}
