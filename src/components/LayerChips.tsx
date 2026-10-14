import { Layers3, Route, Waves } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useApp } from "@/lib/state";
import { FutureLayers } from "./Sidebar";

// Exactly two layer chips, as in the deck, plus "More layers" (opens the existing map controls).
export function LayerChips() {
  const { region, horizon, showPipes, setShowPipes, layers, toggleLayer, panelOpen, setPanelOpen, selection } = useApp();
  const spain = region === "es" || region === "cat";
  const chip = (on: boolean) => `panel pointer-events-auto flex h-8 items-center gap-1.5 rounded-full px-3 text-xs shadow-map-panel ${on ? "font-medium ring-1 ring-primary" : ""}`;
  return (
    <div className={`absolute bottom-4 left-5 z-20 flex flex-wrap gap-1.5 ${selection ? "max-md:hidden" : ""}`}>
      <Popover>
        <PopoverTrigger asChild><button className={chip(showPipes || layers.projects)}><Route className="h-3.5 w-3.5 text-primary" />Existing pipes and infrastructure</button></PopoverTrigger>
        <PopoverContent side="top" align="start" className="w-72 space-y-3 text-xs">
          {spain && <label className="flex cursor-pointer items-center justify-between gap-2"><span><span className="block text-sm font-medium">Illustrative pipe layout</span><span className="text-[11px] text-muted-foreground">Sketch, not real routes · town zoom</span></span><Switch checked={showPipes} onCheckedChange={setShowPipes} /></label>}
          {spain && <label className="flex cursor-pointer items-center justify-between gap-2"><span><span className="block text-sm font-medium">Signed reuse contracts</span><span className="text-[11px] text-muted-foreground">Catalan procurement projects</span></span><Switch checked={layers.projects} onCheckedChange={() => toggleLayer("projects")} /></label>}
          {region === "de" && <label className="flex cursor-pointer items-center justify-between gap-2"><span className="text-sm font-medium">River gauges</span><Switch checked={layers.reservoirs} onCheckedChange={() => toggleLayer("reservoirs")} /></label>}
          <p className="text-[11px] text-muted-foreground">Road routes appear for the selected site.</p>
        </PopoverContent>
      </Popover>
      {spain && <Popover>
        <PopoverTrigger asChild><button className={chip(!!horizon)}><Waves className="h-3.5 w-3.5 text-primary" />Water stress{horizon && <span className="tnum text-muted-foreground">· {horizon}</span>}</button></PopoverTrigger>
        <PopoverContent side="top" align="start" className="w-80 py-1"><FutureLayers /></PopoverContent>
      </Popover>}
      <button className={chip(panelOpen)} onClick={() => setPanelOpen(!panelOpen)} aria-expanded={panelOpen}><Layers3 className="h-3.5 w-3.5" />More layers</button>
    </div>
  );
}
