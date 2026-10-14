import { useState } from "react";
import { TrendingUp, ExternalLink } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SourceInfo } from "@/components/SourceInfo";
import { DROUGHT_COST_SCENARIOS, droughtCostOutlook, droughtEventCost, restrictionDaysAt, reuseInvestmentCase, type DroughtCostInputs } from "@/lib/droughtCosts";
import { SPANISH_DROUGHT_CASES } from "@/lib/sources/droughtCases";
import { useWorkspace } from "@/lib/workspace";

const money = (v: number) => new Intl.NumberFormat("en", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
const fields = [
  { key: "dailyDemand", label: "Water demand · m³/day", initial: "50000", max: 100000000, step: "1" },
  { key: "restrictionDays", label: "Restriction days per event", initial: "90", max: 365, step: "1" },
  { key: "lossPerM3", label: "Lost contribution · €/unmet m³", initial: "50", max: 1000000, step: "0.1" },
  { key: "backupPercent", label: "Restricted volume covered by backup · %", initial: "40", max: 100, step: "1" },
  { key: "backupPremium", label: "Extra backup cost · €/m³", initial: "3", max: 1000000, step: "0.1" },
  { key: "responseCost", label: "One-off response cost · €/event", initial: "250000", max: 1000000000, step: "100" },
  { key: "protectedPercent", label: "Demand on independent supply · %", initial: "0", max: 100, step: "1" },
] as const;
type FieldKey = typeof fields[number]["key"];
const defaults = Object.fromEntries(fields.map((f) => [f.key, f.initial])) as Record<FieldKey, string>;
const investmentFields = [
  { key: "reusePercent", label: "Additional demand protected by reuse · %", initial: "60", max: 100, step: "1" },
  { key: "capital", label: "Installed investment · €", initial: "8000000", max: 1000000000, step: "1000" },
  { key: "operating", label: "Incremental annual running cost · €", initial: "600000", max: 1000000000, step: "100" },
  { key: "frequency", label: "Assumed restriction events per year", initial: "0.5", max: 1, step: "0.1" },
  { key: "waterSales", label: "Annual sales of cleaned water to neighbours · €", initial: "1500000", max: 1000000000, step: "1000" },
  { key: "energySales", label: "Annual energy sales to neighbours · €", initial: "2500000", max: 1000000000, step: "1000" },
] as const;
type InvestmentKey = typeof investmentFields[number]["key"];

// Keeps the existing map integration; replaces purchase-price content with business exposure.
export function WaterPricePanel({ horizon }: { horizon: number }) {
  const { setContact } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(defaults);
  const [investment, setInvestment] = useState(Object.fromEntries(investmentFields.map(f => [f.key, f.initial])) as Record<InvestmentKey, string>);
  const [scenarioId, setScenarioId] = useState<string>("prolonged");
  const [visible, setVisible] = useState<string[]>(DROUGHT_COST_SCENARIOS.map((s) => s.id));
  const valid = fields.every((f) => values[f.key].trim() !== "" && Number.isFinite(Number(values[f.key])) && Number(values[f.key]) >= 0 && Number(values[f.key]) <= f.max);
  const inputs: DroughtCostInputs = {
    dailyDemand: Number(values.dailyDemand), restrictionDays: Number(values.restrictionDays), lossPerM3: Number(values.lossPerM3),
    backupShare: Number(values.backupPercent) / 100, backupPremium: Number(values.backupPremium), responseCost: Number(values.responseCost), protectedShare: Number(values.protectedPercent) / 100,
  };
  const ahead = Math.min(15, Math.max(0, horizon));
  const year = 2026 + ahead;
  const rows = valid ? droughtCostOutlook(inputs) : [];
  const event = valid ? droughtEventCost(inputs, 0.25) : null;
  const investmentValid = investmentFields.every(f => investment[f.key].trim() !== "" && Number.isFinite(Number(investment[f.key])) && Number(investment[f.key]) >= 0 && Number(investment[f.key]) <= f.max);
  const scenario = DROUGHT_COST_SCENARIOS.find(s => s.id === scenarioId) ?? DROUGHT_COST_SCENARIOS[1];
  const project = { additionalProtectedShare: Number(investment.reusePercent) / 100, capitalCost: Number(investment.capital), annualOperatingCost: Number(investment.operating), eventsPerYear: Number(investment.frequency), years: 10, annualWaterSales: Number(investment.waterSales), annualEnergySales: Number(investment.energySales) };
  const comparison = valid && investmentValid ? reuseInvestmentCase(inputs, scenario.cut, restrictionDaysAt(inputs.restrictionDays, scenario.durationGrowth, ahead), project) : null;
  const comparisonRows = comparison ? [{ name: "Without additional reuse", cost: comparison.baseline.total }, { name: "With additional reuse", cost: comparison.withReuse.total }] : [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-6 gap-1.5 px-2 text-[11px]"><span>Drought-cost outlook</span><TrendingUp className="h-3.5 w-3.5" /></Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-24px)] max-w-4xl gap-4 overflow-y-auto rounded-md p-5 sm:p-6">
        <DialogHeader className="pr-5 text-left">
          <DialogTitle>Commercial drought-cost outlook</DialogTitle>
          <DialogDescription>Could water reuse protect your operations—and justify an infrastructure investment?</DialogDescription>
        </DialogHeader>
        <section className="border-b pb-4">
          <p className="text-xs font-medium text-primary">Resilience as an investment case</p>
          <h3 className="mt-1 text-lg font-semibold">Turn drought exposure into a reason to evaluate reuse.</h3>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Catalonia required 15% industrial water-use cuts in 2023 and 25% in 2024. Reclaimed water could supplement allocations in the 2024 emergency, subject to applicable approvals. Compare the same restriction with and without a reliable reuse supply below.</p>
          <p className="mt-2 text-[11px] text-muted-foreground">Documented restrictions · official sources below. Savings and project figures are illustrative calculations, not observed results.</p>
        </section>
        <section className="border-b pb-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-medium">Your commercial exposure</h3><span className="text-[11px] text-muted-foreground">Illustrative defaults · replace with site figures</span></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map((f) => <label key={f.key} className="text-xs font-medium" htmlFor={`drought-${f.key}`}>{f.label}<Input id={`drought-${f.key}`} type="number" min="0" max={f.max} step={f.step} className="mt-1.5 tnum" value={values[f.key]} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} aria-invalid={values[f.key].trim() === "" || !Number.isFinite(Number(values[f.key])) || Number(values[f.key]) < 0 || Number(values[f.key]) > f.max} /></label>)}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">Lost contribution is margin lost per unmet m³, not turnover or the water tariff. Backup cost is incremental to normal supply. Independent supply is assumed available and legally usable during drought—not guaranteed by reuse status.</p>
        </section>
        {!valid && <p role="alert" className="text-xs text-destructive">Enter non-negative numbers within the displayed limits; percentages up to 100 and restriction days up to 365.</p>}
        {event && <section className="grid grid-cols-2 gap-3 border-b pb-4 sm:grid-cols-4" aria-label="Emergency event cost breakdown">
          {[{ label: "Total per emergency event", value: event.total }, { label: "Lost contribution", value: event.disruption }, { label: "Backup premium", value: event.mitigation }, { label: "Response cost", value: event.response }].map((item) => <div key={item.label}><p className="text-[11px] text-muted-foreground">{item.label}</p><p className="mt-1 text-lg font-semibold tnum">{money(item.value)}</p></div>)}
          <p className="col-span-full text-[11px] text-muted-foreground">25% water-use reduction over your {inputs.restrictionDays} days · {Math.round(event.unmetVolume).toLocaleString("en")} m³ unmet after assumed backup. Not a 25% production-loss claim.</p>
        </section>}
        <section className="border-b pb-4" aria-label="Reuse investment comparison">
          <h3 className="text-sm font-medium">What could investing in reuse change?</h3>
          <p className="mt-1 text-[11px] text-muted-foreground">Illustrative project inputs—not supplier quotes. Protected demand means additional supply that remains available, fit for purpose and permitted during restrictions.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {investmentFields.map(f => <label key={f.key} htmlFor={`reuse-${f.key}`} className="text-xs font-medium">{f.label}<Input id={`reuse-${f.key}`} type="number" min="0" max={f.max} step={f.step} className="mt-1.5 tnum" value={investment[f.key]} onChange={e => setInvestment(v => ({ ...v, [f.key]: e.target.value }))} aria-invalid={investment[f.key].trim() === "" || !Number.isFinite(Number(investment[f.key])) || Number(investment[f.key]) < 0 || Number(investment[f.key]) > f.max} /></label>)}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">0.5 events/year means one event every two years on average—your assumption, not a forecast. Running cost is net of normal supply costs displaced.</p>
          <div className="my-3 flex flex-wrap gap-2" role="group" aria-label="Investment restriction scenario">
            {DROUGHT_COST_SCENARIOS.map(s => <Button key={s.id} size="sm" variant={scenarioId === s.id ? "secondary" : "outline"} aria-pressed={scenarioId === s.id} onClick={() => setScenarioId(s.id)}>{s.label}</Button>)}
          </div>
          {!investmentValid && <p role="alert" className="text-xs text-destructive">Enter valid project figures; protected demand up to 100% and event frequency up to 1 per year.</p>}
          {comparison && <>
            <p className="mb-3 text-[11px] text-muted-foreground">{scenario.cut * 100}% cut · {Math.round(restrictionDaysAt(inputs.restrictionDays, scenario.durationGrowth, ahead))} days · event in {year}</p>
            <div className="grid gap-4 sm:grid-cols-3" aria-live="polite">
              <div><p className="text-[11px] text-muted-foreground">Potential avoided cost / event</p><p className="mt-1 text-2xl font-semibold text-primary tnum">{money(comparison.avoidedPerEvent)}</p><p className="mt-1 text-[11px] text-muted-foreground">{Math.round(comparison.protectedVolume).toLocaleString("en")} m³ of restriction shortfall avoided</p></div>
              <div><p className="text-[11px] text-muted-foreground">Annual sales to neighbours</p><p className="mt-1 text-2xl font-semibold tnum">{money(comparison.annualRevenue)}</p><p className="mt-1 text-[11px] text-muted-foreground">Cleaned water + energy · your assumption</p></div>
              <div><p className="text-[11px] text-muted-foreground">Net annual benefit incl. sales</p><p className="mt-1 text-2xl font-semibold tnum">{money(comparison.annualNet)}</p><p className="mt-1 text-[11px] text-muted-foreground">After running costs, before financing</p></div>
              <div><p className="text-[11px] text-muted-foreground">Simple payback</p><p className="mt-1 text-2xl font-semibold tnum">{comparison.simplePayback === null ? "Not reached" : `${comparison.simplePayback.toFixed(1)} years`}</p><p className="mt-1 text-[11px] text-muted-foreground">Not a guaranteed return</p></div>
            </div>
            <div className="mt-4 space-y-3" aria-label="Drought event cost with and without reuse">
              {comparisonRows.map((row, index) => <div key={row.name}><div className="mb-1 flex justify-between gap-3 text-xs"><span>{row.name}</span><span className="font-medium tnum">{money(row.cost)}</span></div><div className="h-3 overflow-hidden rounded-sm bg-muted"><svg width="100%" height="12" aria-hidden="true"><rect width={`${comparison.baseline.total > 0 ? row.cost / comparison.baseline.total * 100 : 0}%`} height="12" fill={index === 0 ? "var(--chart-3)" : "var(--primary)"} /></svg></div></div>)}
            </div>
            <p className="mt-3 text-xs font-medium">10-year net benefit after investment: <span className="tnum">{money(comparison.netOverPeriod)}</span></p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Repeats this selected event severity at your assumed frequency for 10 years. Undiscounted; excludes financing, tax, grants, inflation and everyday tariff savings. Negative results mean drought resilience alone does not cover the entered costs. Validate supply reliability, treatment, storage, permits and a priced design before investing.</p>
          </>}
          <Button className="mt-4" onClick={() => { setOpen(false); setContact(`Evaluate a water reuse investment · ${valid ? `${inputs.dailyDemand} m³/day` : "commercial site"}${comparison ? ` · indicative avoided cost ${money(comparison.avoidedPerEvent)}/event` : ""}`); }}>Discuss a reuse project</Button>
        </section>
        <section>
          <h3 className="text-sm font-medium">Future cost if a restriction event occurs</h3>
          <p className="mt-1 text-[11px] text-muted-foreground">Cost per event, not an expected annual loss. No event probability or link to the illustrative map is assumed.</p>
          <div className="mt-2 h-56 min-w-0 w-full sm:h-64" role="img" aria-label="Assumed commercial drought cost per event from 2026 to 2041 under three duration scenarios">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 12, right: 15, bottom: 5, left: 0 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="year" type="number" domain={[2026, 2041]} ticks={[2026, 2028, 2031, 2036, 2041]} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
                <YAxis tickFormatter={(v: number) => v >= 1000 ? `€${Math.round(v / 1000)}k` : `€${v}`} width={58} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
                <Tooltip formatter={(value: number) => [money(value)]} labelFormatter={(value) => `Event in ${value}`} contentStyle={{ background: "var(--popover)", borderColor: "var(--border)", color: "var(--popover-foreground)", fontSize: 12 }} />
                <ReferenceLine x={year} stroke="var(--primary)" strokeDasharray="2 4" />
                {DROUGHT_COST_SCENARIOS.filter((s) => visible.includes(s.id)).map((s) => <Line key={s.id} dataKey={s.id} name={s.label} stroke={s.color} strokeWidth={2.5} strokeDasharray="6 4" dot={false} isAnimationActive={false} />)}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {DROUGHT_COST_SCENARIOS.map((s) => <Button key={s.id} variant={visible.includes(s.id) ? "secondary" : "outline"} aria-pressed={visible.includes(s.id)} className="h-auto items-start justify-start gap-2 whitespace-normal px-3 py-2 text-left" onClick={() => setVisible((v) => v.includes(s.id) ? v.filter((id) => id !== s.id) : [...v, s.id])}>
              <span className={s.id === "contained" ? "mt-1 h-5 w-1 shrink-0 bg-chart-1" : s.id === "prolonged" ? "mt-1 h-5 w-1 shrink-0 bg-chart-3" : "mt-1 h-5 w-1 shrink-0 bg-chart-4"} />
              <span className="min-w-0"><span className="block text-xs font-medium">{s.label}</span><span className="block text-[11px] font-normal text-muted-foreground">{s.cut * 100}% cut · {s.durationGrowth ? `duration +${s.durationGrowth * 100}%/year` : "unchanged duration"}</span><span className="mt-1 block text-xs tnum">{valid ? `${money(droughtEventCost(inputs, s.cut, restrictionDaysAt(inputs.restrictionDays, s.durationGrowth, ahead)).total)} · ${year}` : "—"}</span></span>
            </Button>)}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">Sensitivity assumptions, not predictions: 15% or 25% cuts are historical industrial benchmarks. Future event duration stays constant or compounds by 2% or 5% per year, capped at 365 days. Unit losses and backup costs stay fixed; inflation, fines and reuse investment costs are excluded.</p>
        </section>
        <section className="border-t pt-4">
          <h3 className="flex items-center gap-2 text-sm font-medium">Past real drought restrictions in Spain <SourceInfo id="droughtCases" /></h3>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Two documented Catalan episodes—not a national history or rules for every business sector. Costs below replay those industrial cuts using your same duration and site inputs; they are not recorded historical losses.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {SPANISH_DROUGHT_CASES.map((c) => <article key={c.id} className="rounded-md border p-3">
              <p className="text-[11px] text-muted-foreground">{c.period} · documented restriction</p><h4 className="mt-1 text-sm font-medium">{c.name}</h4><p className="mt-1 text-[11px] text-muted-foreground">{c.area}</p>
              <div className="my-3 flex flex-wrap items-baseline justify-between gap-2"><span className="text-xl font-semibold tnum">{c.industrialCut * 100}% <span className="text-xs font-normal">industrial cut</span></span><span className="text-sm font-medium tnum">{valid ? money(droughtEventCost(inputs, c.industrialCut).total) : "—"}<span className="block text-[10px] font-normal text-muted-foreground">Your estimated event cost</span></span></div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">{c.note}</p><a href={c.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-primary">Official source <ExternalLink className="h-3 w-3" /></a>
            </article>)}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">Commercial uses such as hospitality, agriculture and industry face different rules. Confirm your supply unit, permit, savings plan and supplier obligations. This is indicative business screening, not a validated forecast, legal advice or engineer review.</p>
        </section>
      </DialogContent>
    </Dialog>
  );
}
