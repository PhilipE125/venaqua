import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SourceInfo } from "@/components/SourceInfo";
import { PRICE_SCENARIOS, priceAt, projectWaterPrices } from "@/lib/waterPrices";
import { WATER_PRICE_BASE_YEAR, WATER_PRICE_BENCHMARK, WATER_PRICE_HISTORY, WATER_PRICE_HISTORY_LAST_YEAR } from "@/lib/sources/waterPrices";

const euro = new Intl.NumberFormat("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function WaterPricePanel({ horizon }: { horizon: number }) {
  const [baseInput, setBaseInput] = useState(String(WATER_PRICE_BENCHMARK));
  const [visible, setVisible] = useState<string[]>(PRICE_SCENARIOS.map((s) => s.id));
  const base = Number(baseInput);
  const valid = baseInput.trim() !== "" && Number.isFinite(base) && base > 0 && base <= 100;
  const rows = valid ? [...WATER_PRICE_HISTORY, { year: 2024 }, ...projectWaterPrices(base, WATER_PRICE_BASE_YEAR, 15)] : [...WATER_PRICE_HISTORY];
  const year = WATER_PRICE_BASE_YEAR + horizon;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="mt-3 w-full justify-between text-xs"><span>Freshwater price outlook</span><TrendingUp className="h-3.5 w-3.5" /></Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-24px)] max-w-3xl gap-4 overflow-y-auto rounded-md p-5 sm:p-6">
        <DialogHeader className="pr-5 text-left">
          <DialogTitle>Freshwater price outlook</DialogTitle>
          <DialogDescription>Reported Spanish supply costs and commercial-price sensitivity under three stress scenarios.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-end justify-between gap-3 border-b pb-3">
          <label className="text-xs font-medium" htmlFor="freshwater-base">Your current commercial supply price · €/m³
            <Input id="freshwater-base" type="number" min="0.01" max="100" step="0.01" className="mt-1.5 w-32 tnum" value={baseInput} onChange={(e) => setBaseInput(e.target.value)} aria-invalid={!valid} />
          </label>
          <p className="max-w-72 text-[11px] leading-relaxed text-muted-foreground">Default €1.16 is the last verified national supply benchmark (2022), carried forward as an assumption—not a 2026 commercial tariff.</p>
        </div>
        {!valid && <p role="alert" className="text-xs text-destructive">Enter a price above €0 and up to €100 per m³.</p>}
        <div className="h-64 min-w-0 w-full sm:h-72" role="img" aria-label="Historical national freshwater supply cost from 2010 to 2022 and assumed commercial price paths from 2026 to 2041">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 20, right: 12, bottom: 5, left: 0 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="year" type="number" domain={[2010, 2041]} ticks={[2010, 2016, 2022, 2026, 2031, 2036, 2041]} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
              <YAxis tickFormatter={(v: number) => `€${v.toFixed(1)}`} width={46} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
              <Tooltip formatter={(value: number) => [`€${euro.format(value)}/m³`]} labelFormatter={(value) => `Year ${value}`} contentStyle={{ background: "var(--popover)", borderColor: "var(--border)", color: "var(--popover-foreground)", fontSize: 12 }} />
              <ReferenceArea x1={2026} x2={2041} fill="var(--accent)" fillOpacity={0.5} />
              <ReferenceLine x={2026} stroke="var(--muted-foreground)" strokeDasharray="3 4" label={{ value: "Scenarios →", fill: "var(--muted-foreground)", fontSize: 10, position: "insideTopRight" }} />
              {horizon > 0 && <ReferenceLine x={year} stroke="var(--primary)" strokeDasharray="2 4" />}
              <Line dataKey="historical" name="Reported national supply cost" stroke="var(--foreground)" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} connectNulls={false} />
              {PRICE_SCENARIOS.filter((s) => visible.includes(s.id)).map((s) => <Line key={s.id} dataKey={s.id} name={s.label} stroke={s.color} strokeWidth={2.5} strokeDasharray="6 4" dot={false} isAnimationActive={false} connectNulls={false} />)}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {PRICE_SCENARIOS.map((s) => <Button key={s.id} variant={visible.includes(s.id) ? "secondary" : "outline"} aria-pressed={visible.includes(s.id)} className="h-auto justify-start gap-2 px-3 py-2 text-left" onClick={() => setVisible((v) => v.includes(s.id) ? v.filter((id) => id !== s.id) : [...v, s.id])}>
            <span className={s.id === "managed" ? "h-5 w-1 shrink-0 bg-chart-1" : s.id === "rising" ? "h-5 w-1 shrink-0 bg-chart-3" : "h-5 w-1 shrink-0 bg-chart-4"} />
            <span className="min-w-0"><span className="block text-xs font-medium">{s.label}</span><span className="block text-[11px] font-normal text-muted-foreground">+{s.rate * 100}% / year{valid ? ` · €${euro.format(priceAt(base, s.rate, horizon || 15))} in ${horizon ? year : 2041}` : ""}</span></span>
          </Button>)}
        </div>
        <div className="space-y-2 border-t pt-3 text-[11px] leading-relaxed text-muted-foreground">
          <p className="flex items-center gap-2"><span className="font-medium text-foreground">History · INE · 2010–{WATER_PRICE_HISTORY_LAST_YEAR}</span><SourceInfo id="waterPrices" date="2022" /></p>
          <p>History is the national average supply cost across households and other users, not a commercial-only tariff. Sewerage and treatment are excluded. No observations are filled in after 2022; VAT and local charges need checking against your bill.</p>
          <p><span className="font-medium text-foreground">Scenario assumptions, not predictions:</span> nominal prices compound at 2%, 5% or 8% per year. Stress names are illustrative sensitivities, not calibrated relationships to the map. No local tariff forecast or engineer review is implied.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}