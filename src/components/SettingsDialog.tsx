import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Range } from "@/lib/costs";
import { SECTORS } from "@/lib/sectors";
import { PHASES } from "@/lib/sources/drought";
import { DEFAULT_SETTINGS, useApp, type Settings } from "@/lib/state";

const n = (v: string) => Math.max(0, Number(v) || 0);
const REGION_NAME = { es: "Spain", cat: "Catalonia", de: "Germany", fr: "France" } as const;

const CITATIONS: { label: string; url: string }[] = [
  { label: "INE table 01003, 2022: water supply and sewerage €/m³, Spain and Catalonia", url: "https://www.ine.es/jaxi/files/_px/csv_bd/t26/p069/p03/l0/serie/01003.csv" },
  { label: "OFB/SISPEA 2025: average water price in France, 1 Jan 2024", url: "https://www.ofb.gouv.fr/sites/default/files/Fichiers/Presse/CP_SISPEA_2025_VF.pdf" },
  { label: "ZfK 2024: water and sewerage charges, Baden-Württemberg", url: "https://www.zfk.de/wasser-abwasser/wasser/ba-wue-wassergebuehren-steigen-staerker-als-die-inflation" },
  { label: "Iglesias et al. 2017, Water Sci. Technol.: MBR and reclamation capex 700–1,250 € per m³/day at 8–15k m³/day (smaller industrial plants cost more)", url: "https://www.thembrsite.com/features/cost-comparison-of-full-scale-water-reclamation-technologies-with-an-emphasis-on-membrane-bioreactors" },
  { label: "Echevarría et al. 2022, Sci. Total Environ.: UF/RO polishing of municipal effluent for industry, Barcelona", url: "https://doi.org/10.1016/j.scitotenv.2021.152842" },
  { label: "Calle et al. 2023, npj Clean Water: reclaimed-water network construction costs, Catalonia", url: "https://www.nature.com/articles/s41545-023-00222-4" },
  { label: "Hilbig et al. 2020, J. Water Reuse Desal.: modular cost functions for industrial reuse", url: "https://iwaponline.com/jwrd/article/10/4/419/77806/Economic-evaluation-of-different-treatment-options" },
];

export function SettingsDialog({ children }: { children: ReactNode }) {
  const { settings, setSettings, region } = useApp();
  const [draft, setDraft] = useState<Settings>(settings);
  const [open, setOpen] = useState(false);
  const setR = (k: keyof Settings, i: 0 | 1, v: string) => {
    const r = [...(draft[k] as Range)] as Range;
    r[i] = n(v);
    setDraft({ ...draft, [k]: r });
  };
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setDraft(settings); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assumptions</DialogTitle>
          <DialogDescription>All values here are assumptions or benchmark ranges, not measurements.</DialogDescription>
        </DialogHeader>

        <p className="label-caps">Prices and finance</p>
        <div className="grid grid-cols-4 gap-3">
          <Field label={`Supply tariff €/m³ · ${REGION_NAME[region]}`} value={draft.tariffs[region].supply} onChange={(v) => setDraft({ ...draft, tariffs: { ...draft.tariffs, [region]: { ...draft.tariffs[region], supply: n(v) } } })} />
          <Field label={`Sewerage €/m³ · ${REGION_NAME[region]}`} value={draft.tariffs[region].discharge} onChange={(v) => setDraft({ ...draft, tariffs: { ...draft.tariffs, [region]: { ...draft.tariffs[region], discharge: n(v) } } })} />
          <Field label="Discount rate" value={draft.rate} onChange={(v) => setDraft({ ...draft, rate: n(v) })} />
          <Field label="Lifetime, years" value={draft.years} step={1} onChange={(v) => setDraft({ ...draft, years: Math.max(1, n(v)) })} />
          <Field label="Electricity low €/kWh" value={draft.electricity.low} onChange={(v) => setDraft({ ...draft, electricity: { ...draft.electricity, low: n(v) } })} />
          <Field label="Electricity base" value={draft.electricity.base} onChange={(v) => setDraft({ ...draft, electricity: { ...draft.electricity, base: n(v) } })} />
          <Field label="Electricity high" value={draft.electricity.high} onChange={(v) => setDraft({ ...draft, electricity: { ...draft.electricity, high: n(v) } })} />
          <Field label="Value lost €/m³ cut" value={draft.valuePerM3Lost} onChange={(v) => setDraft({ ...draft, valuePerM3Lost: n(v) })} />
        </div>

        <p className="label-caps mt-2">Grid connection (B)</p>
        <div className="grid grid-cols-4 gap-3">
          <RangeField label="Pipe €/km" value={draft.pipeCostPerKm} step={10000} onChange={(i, v) => setR("pipeCostPerKm", i, v)} />
          <RangeField label="Polishing €/m³" value={draft.polishing} onChange={(i, v) => setR("polishing", i, v)} />
          <RangeField label="Reclaimed price €/m³" value={draft.reclaimedPrice} onChange={(i, v) => setR("reclaimedPrice", i, v)} />
          <Field label="Detour factor" value={draft.detourFactor} onChange={(v) => setDraft({ ...draft, detourFactor: n(v) })} />
          <Field label="Friction m per 10 km" value={draft.frictionPer10km} step={1} onChange={(v) => setDraft({ ...draft, frictionPer10km: n(v) })} />
          <Field label="Pump efficiency" value={draft.pumpEfficiency} onChange={(v) => setDraft({ ...draft, pumpEfficiency: n(v) })} />
        </div>

        <p className="label-caps mt-2">On-site reuse (C)</p>
        <div className="grid grid-cols-4 gap-3">
          <RangeField label="Recovery rate" value={draft.recoveryRate} onChange={(i, v) => setR("recoveryRate", i, v)} />
          <RangeField label="Capex € per m³/day" value={draft.onsiteCapex} step={100} onChange={(i, v) => setR("onsiteCapex", i, v)} />
          <RangeField label="Opex €/m³" value={draft.onsiteOpex} onChange={(i, v) => setR("onsiteOpex", i, v)} />
        </div>

        <p className="label-caps mt-2">Industrial supply cut by drought phase (placeholders to validate)</p>
        <div className="grid grid-cols-5 gap-3">
          {PHASES.map((p) => (
            <Field key={p} label={p} value={draft.droughtCut[p]} onChange={(v) => setDraft({ ...draft, droughtCut: { ...draft.droughtCut, [p]: Math.min(1, n(v)) } })} />
          ))}
        </div>

        <p className="label-caps mt-2">Sector demand estimate, m³/day per site</p>
        <div className="grid grid-cols-3 gap-x-4 gap-y-2">
          {SECTORS.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2">
              <Label className="text-xs font-normal">{s.label}</Label>
              <Input
                type="number"
                className="tnum h-7 w-20 text-right text-xs"
                value={draft.sectorDemand[s.id]}
                onChange={(e) => setDraft({ ...draft, sectorDemand: { ...draft.sectorDemand, [s.id]: n(e.target.value) } })}
              />
            </div>
          ))}
        </div>

        <div className="rounded-sm border bg-muted/40 p-3 text-[11px] text-muted-foreground">
          <p className="label-caps mb-1">Benchmark sources</p>
          <ul className="space-y-1">
            {CITATIONS.map((c) => (
              <li key={c.url}><a href={c.url} target="_blank" rel="noreferrer" className="hover:text-foreground hover:underline">{c.label}</a></li>
            ))}
            <li>Tariff: INE Spain average water price, 2022. Discharge charge, electricity, reclaimed price and drought cuts: placeholders.</li>
          </ul>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => setDraft(DEFAULT_SETTINGS)}>Reset defaults</Button>
          <Button onClick={() => { setSettings(draft); setOpen(false); }}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, onChange, step = 0.01 }: { label: string; value: number; onChange: (v: string) => void; step?: number }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-normal capitalize text-muted-foreground">{label}</Label>
      <Input type="number" step={step} className="tnum h-8 text-xs" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function RangeField({ label, value, onChange, step = 0.01 }: { label: string; value: Range; onChange: (i: 0 | 1, v: string) => void; step?: number }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-normal text-muted-foreground">{label}</Label>
      <div className="flex gap-1">
        <Input type="number" step={step} aria-label={`${label} low`} className="tnum h-8 px-1.5 text-xs" value={value[0]} onChange={(e) => onChange(0, e.target.value)} />
        <Input type="number" step={step} aria-label={`${label} high`} className="tnum h-8 px-1.5 text-xs" value={value[1]} onChange={(e) => onChange(1, e.target.value)} />
      </div>
    </div>
  );
}
