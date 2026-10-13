import { useState } from "react";
import { Check, ChevronDown, MapPin } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { usePrefetchRegion } from "@/lib/queries";
import { useApp, type Region } from "@/lib/state";
import { cn } from "@/lib/utils";

type Area = { id: Region; name: string };
type Country = Area & { subareas: Area[] };

/** Add countries and their sub-areas here as coverage grows. */
export const COUNTRIES: Country[] = [
  { id: "es", name: "Spain", subareas: [{ id: "cat", name: "Catalonia" }] },
];

function labelFor(region: Region) {
  for (const c of COUNTRIES) {
    if (c.id === region) return c.name;
    const s = c.subareas.find(a => a.id === region);
    if (s) return `${c.name} · ${s.name}`;
  }
  return "Spain";
}

export function RegionPicker() {
  const { region, setRegion } = useApp();
  const prefetch = usePrefetchRegion();
  const [open, setOpen] = useState(false);
  const pick = (r: Region) => { setRegion(r); setOpen(false); };
  return <Popover open={open} onOpenChange={o => { setOpen(o); if (o) prefetch("es"); }}>
    <PopoverTrigger asChild>
      <button className="flex h-8 items-center gap-1.5 rounded-md bg-muted px-2.5 text-xs" aria-label="Choose area">
        <MapPin className="h-3.5 w-3.5 text-primary" />{labelFor(region)}<ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </button>
    </PopoverTrigger>
    <PopoverContent align="start" className="w-64 p-0">
      <Command>
        <CommandInput placeholder="Search country or area…" />
        <CommandList>
          <CommandEmpty>No area found.</CommandEmpty>
          {COUNTRIES.map(c => <CommandGroup key={c.id} heading={c.name}>
            <CommandItem value={`${c.name} all`} onSelect={() => pick(c.id)}>
              <span className="flex-1">All of {c.name}</span>{region === c.id && <Check className="h-3.5 w-3.5" />}
            </CommandItem>
            {c.subareas.map(s => <CommandItem key={s.id} value={`${c.name} ${s.name}`} onSelect={() => pick(s.id)} className="pl-6">
              <span className={cn("flex-1")}>{s.name}</span>{region === s.id && <Check className="h-3.5 w-3.5" />}
            </CommandItem>)}
          </CommandGroup>)}
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>;
}
