import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SECTORS } from "@/lib/sectors";
import { DEFAULT_SETTINGS, useApp, type Settings } from "@/lib/state";

export function SettingsDialog({ children }: { children: ReactNode }) {
  const { settings, setSettings } = useApp();
  const [draft, setDraft] = useState<Settings>(settings);
  const [open, setOpen] = useState(false);
  const n = (v: string) => Math.max(0, Number(v) || 0);
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setDraft(settings); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assumptions</DialogTitle>
          <DialogDescription>All values here are estimates or placeholders, not measurements.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Water tariff €/m³" value={draft.tariff} onChange={(v) => setDraft({ ...draft, tariff: n(v) })} step={0.01} />
          <Field label="Reclaimed price €/m³" value={draft.reclaimedPrice} onChange={(v) => setDraft({ ...draft, reclaimedPrice: n(v) })} step={0.01} />
          <Field label="Pipe cost €/km" value={draft.pipeCostPerKm} onChange={(v) => setDraft({ ...draft, pipeCostPerKm: n(v) })} step={1000} />
        </div>
        <p className="label-caps mt-2">Sector demand estimate, m³/day per site</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {SECTORS.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2">
              <Label className="text-xs font-normal">{s.label}</Label>
              <Input
                type="number"
                className="tnum h-7 w-24 text-right text-xs"
                value={draft.sectorDemand[s.id]}
                onChange={(e) => setDraft({ ...draft, sectorDemand: { ...draft.sectorDemand, [s.id]: n(e.target.value) } })}
              />
            </div>
          ))}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => setDraft(DEFAULT_SETTINGS)}>Reset defaults</Button>
          <Button onClick={() => { setSettings(draft); setOpen(false); }}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, onChange, step }: { label: string; value: number; onChange: (v: string) => void; step: number }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-normal text-muted-foreground">{label}</Label>
      <Input type="number" step={step} className="tnum h-8 text-xs" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
