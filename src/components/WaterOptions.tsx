import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { OpportunitySnapshot } from "@/lib/project-model";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { crf, droughtLoss, mid, opportunityCost, optionA, optionB, optionC, type CostInputs, type Range } from "@/lib/costs";
import { eurK, fmt, fmt1, fmt2, useDrought, useElevation, useRestriction, useWwtps } from "@/lib/queries";
import { haversineKm } from "@/lib/score";
import { muniKey } from "@/lib/sectors";
import { currentPhase, phaseDaysInYear, PHASES, type Phase } from "@/lib/sources/drought";
import { useApp, useScenarioState, type Mode } from "@/lib/state";
import { Answer, Details } from "./Drawer";
import { FuturePanel, type FutureInputs } from "./FuturePanel";
import type { Company, Plant } from "@/lib/types";
import { QualityBadge, SourceInfo } from "./SourceInfo";

const SEARCH_KM = 30;

function NumField({ label, value, onChange, step = 0.01, suffix }: { label: string; value: number; onChange: (n: number) => void; step?: number; suffix?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-normal text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-1">
        <Input type="number" step={step} className="tnum h-7 px-2 text-xs" value={value} onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))} />
        {suffix && <span className="text-[11px] text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

function RangeBars({ rows, tariff, max }: { rows: { key: string; label: string; perM3: Range; best: boolean }[]; tariff: number; max: number }) {
  const x = (v: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;
  return (
    <div className="relative mt-1 pb-5">
      <div className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.key} className="grid grid-cols-[88px_1fr] items-center gap-2">
            <span className="truncate text-xs">{r.label}</span>
            <div className="relative h-4 rounded-sm bg-muted">
              <div
                className={`absolute top-0 h-4 rounded-sm ${r.best ? "bg-primary" : "bg-foreground/35"}`}
                style={{ left: x(r.perM3[0]), width: `max(3px, calc(${x(r.perM3[1])} - ${x(r.perM3[0])}))` }}
                title={`${fmt2.format(r.perM3[0])}–${fmt2.format(r.perM3[1])} €/m³`}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute bottom-5 top-0 grid w-full grid-cols-[88px_1fr] gap-2">
        <span />
        <div className="relative">
          <div className="absolute -top-1 bottom-0 border-l border-foreground" style={{ left: x(tariff) }} />
          <span className="label-caps absolute -bottom-4 -translate-x-1/2 whitespace-nowrap" style={{ left: x(tariff) }}>
            tariff {fmt2.format(tariff)}
          </span>
        </div>
      </div>
      <div className="absolute bottom-0 grid w-full grid-cols-[88px_1fr] gap-2 text-[10px] text-muted-foreground">
        <span />
        <div className="tnum flex justify-between"><span>0</span><span>{fmt1.format(max)} €/m³</span></div>
      </div>
    </div>
  );
}

const fmtR = (r: Range, f: (n: number) => string) => (Math.abs(r[0] - r[1]) < 1e-9 ? f(r[0]) : `${f(r[0])}–${f(r[1])}`);

const EFFLUENT = { light: { label: "Light (cooling, rinsing)", k: 0.8 }, medium: { label: "Medium (mixed process)", k: 1 }, heavy: { label: "Heavy (food, chemicals)", k: 1.4 } } as const;

export function WaterOptions({ company, focus = "all", view = "economics", onSummary }: { company: Company; focus?: Mode; view?: "overview" | "economics"; onSummary?: ((p: OpportunitySnapshot) => void) | undefined }) {
  const { settings, demandOverride, setDemandOverride, select, region } = useApp();
  const w = useWwtps();
  const drought = useDrought();
  const restriction = useRestriction(company);
  const [tariffShock, setTariffShock] = useScenarioState(`${company.id}:tariffShock`, "0");
  const [elec, setElec] = useScenarioState<"low" | "base" | "high">(`${company.id}:elec`, "base");
  const [phaseOverride, setPhaseOverride] = useScenarioState<Phase | "current">(`${company.id}:phaseOverride`, "current");
  const [replay, setReplay] = useScenarioState(`${company.id}:replay`, false);
  const [effluent, setEffluent] = useScenarioState<keyof typeof EFFLUENT>(`${company.id}:effluent`, company.sector === "food" || company.sector === "chemicals" ? "heavy" : "medium");
  const [dischargePct, setDischargePct] = useScenarioState(`${company.id}:dischargePct`, 80);
  const [local, setLocal] = useScenarioState(`${company.id}:local`, { tariff: settings.tariff, dischargeCharge: settings.dischargeCharge, rate: settings.rate, years: settings.years });

  const sectorQ = (settings.sectorDemand[company.sector] ?? 0) * 365;
  const userQ = demandOverride[company.id];
  const Q = userQ ?? sectorQ;

  // Candidate plant: available reclaimed > 0, prefer reuse-ready, then nearest.
  const candidate = useMemo(() => {
    const list = (w.data?.features ?? [])
      .filter((p): p is Plant & { supply: NonNullable<Plant["supply"]> } => !!p.supply && p.supply.availableReclaimed > 0)
      .map((p) => ({ p, d: haversineKm(p, company) }))
      .filter((x) => x.d <= SEARCH_KM)
      .sort((a, b) => a.d - b.d);
    return list.find((x) => x.p.supply.reuseReady) ?? list[0] ?? null;
  }, [w.data, company]);
  const elev = useElevation(candidate?.p, company);

  // France: today's VigiEau restriction stands in for the Catalan drought-phase history.
  const events = region === "fr" ? (restriction.data ? [restriction.data] : undefined) : drought.data?.byMuni.get(muniKey(company.municipi));
  const cur = currentPhase(events);
  const phase: Phase = phaseOverride === "current" ? (cur?.phase ?? "normal") : phaseOverride;

  const calc = useMemo(() => {
    const tariff = local.tariff * (1 + Number(tariffShock) / 100);
    const e = settings.electricity[elec];
    // Discharge charge applies to the share of water discharged, spread over total demand.
    const inputs: CostInputs = { demandM3PerYear: Q, tariff, dischargeCharge: local.dischargeCharge * (dischargePct / 100), rate: local.rate, years: local.years, electricity: [e, e] };
    const A = optionA(inputs);
    const distanceKm = candidate ? candidate.d * settings.detourFactor : 0;
    const liftM = elev.data ? Math.max(0, elev.data.b - elev.data.a) + (settings.frictionPer10km * distanceKm) / 10 : (settings.frictionPer10km * distanceKm) / 10;
    const B = candidate
      ? optionB(inputs, {
          distanceKm,
          liftM,
          pumpEfficiency: settings.pumpEfficiency,
          pipeCostPerKm: settings.pipeCostPerKm,
          polishing: candidate.p.supply.reuseReady ? [0, 0] : settings.polishing,
          reclaimedPrice: settings.reclaimedPrice,
          availableM3PerDay: candidate.p.supply.availableReclaimed,
        })
      : null;
    const ek = EFFLUENT[effluent].k;
    const C = optionC(inputs, { recoveryRate: settings.recoveryRate, capexPerM3Day: [settings.onsiteCapex[0] * ek, settings.onsiteCapex[1] * ek], opex: [settings.onsiteOpex[0] * ek, settings.onsiteOpex[1] * ek] });

    // Drought: current/selected phase, or 2023 replay weighted by days in each phase.
    let cut = settings.droughtCut[phase];
    let days2023: Record<Phase, number> | null = null;
    if (replay) {
      days2023 = phaseDaysInYear(events, 2023);
      cut = PHASES.reduce((s, ph) => s + (days2023![ph] / 365) * settings.droughtCut[ph], 0);
    }
    const lossA = droughtLoss(Q, cut, settings.valuePerM3Lost);
    const lossB = B ? droughtLoss(Q, cut, settings.valuePerM3Lost, B.coverage) : lossA;
    const lossC = droughtLoss(Q, cut, settings.valuePerM3Lost, mid(settings.recoveryRate));
    const bAnnual = B?.annualCost ?? ([Infinity, Infinity] as Range);
    const bestIsB = !!B && mid(bAnnual) + lossB < mid(C.annualCost) + lossC;
    const opp = opportunityCost(A.annualCost, bAnnual, C.annualCost, lossA, bestIsB ? lossB : lossC);
    const cheapest = mid(A.annualCost) + lossA <= Math.min(mid(bAnnual) + lossB, mid(C.annualCost) + lossC) ? "A" : bestIsB ? "B" : "C";
    const k = crf(local.rate, local.years);
    const future: FutureInputs = {
      q: Q,
      tariff0: tariff,
      dischargeCharge: inputs.dischargeCharge,
      valuePerM3Lost: settings.valuePerM3Lost,
      cuts: settings.droughtCut,
      events,
      B: B ? { capex: mid(B.capex), opexAtT0: mid(B.annualCost) - mid(B.capex) * k, mainsShare: 1 - B.coverage, coverage: B.coverage } : null,
      C: { capex: mid(C.capex), opexAtT0: mid(C.annualCost) - mid(C.capex) * k, mainsShare: 1 - mid(settings.recoveryRate), protectedShare: mid(settings.recoveryRate) },
    };
    return { tariff, A, B, C, distanceKm, liftM, lossA, lossB, lossC, opp, cheapest, days2023, cut, future };
  }, [Q, local, tariffShock, elec, settings, candidate, elev.data, phase, replay, events, effluent, dischargePct]);

  const { A, B, C } = calc;
  const deliveredCost = B ? `€${fmt2.format(B.perM3[0])}–${fmt2.format(B.perM3[1])}/m³` : "No connection identified";
  const savings = calc.cheapest === "A" ? "No saving under current assumptions" : `${eurK(Math.max(0, A.annualCost[0] - (calc.cheapest === "B" && B ? B.annualCost[1] : C.annualCost[1])))}–${eurK(Math.max(0, A.annualCost[1] - (calc.cheapest === "B" && B ? B.annualCost[0] : C.annualCost[0])))} / year`;
  const verdict = calc.cheapest === "A" ? "Keep mains water for now: alternatives do not beat your current cost under these assumptions." : `Potential savings with ${calc.cheapest === "B" ? "a recycled-water connection" : "on-site reuse"}; firm demand and engineering costs need validation.`;
  useEffect(() => { onSummary?.({ id: company.id, kind: "company", name: company.name, location: company.municipi, plant: candidate?.p.name ?? "", buyer: company.name, volume: Q / 365, distance: candidate?.d ?? null, confidence: userQ != null ? "Needs user confirmation · demand supplied by you" : "Estimated demand · modelled economics", blocker: "Demand, water quality and final pipe route are not validated.", nextAction: "Confirm annual demand and water-quality requirements with the site team.", cost: deliveredCost, value: savings, verdict }); }, [onSummary, company.id, company.name, company.municipi, candidate?.p.name, candidate?.d, Q, userQ, deliveredCost, savings, verdict]);
  if (w.isLoading || !w.data) return <Skeleton className="h-60 w-full" />;
  const max = Math.max(calc.tariff + local.dischargeCharge, A.perM3[1], B?.perM3[1] ?? 0, C.perM3[1]) * 1.1;
  const rows = [
    { key: "A", label: "A · Status quo", perM3: A.perM3, best: calc.cheapest === "A" },
    ...(B ? [{ key: "B", label: "B · Grid reuse", perM3: B.perM3, best: calc.cheapest === "B" }] : []),
    { key: "C", label: "C · On site", perM3: C.perM3, best: calc.cheapest === "C" },
  ];

  const names = { A: "doing nothing", B: "connecting to recycled water", C: "on-site reuse" } as const;
  const saving = B && calc.cheapest === "B" ? [A.annualCost[0] - B.annualCost[1], A.annualCost[1] - B.annualCost[0]] : [A.annualCost[0] - C.annualCost[1], A.annualCost[1] - C.annualCost[0]];
  const measured = [candidate?.p.supply.actualQuality === "measured", userQ != null, !!elev.data].filter(Boolean).length;
  const confidence = <span className="text-muted-foreground"> Confidence: {measured} of 3 key inputs are measured or yours (plant flow, your demand, elevation); costs are benchmarks.</span>;
  const answer =
    focus === "q2" ? (
      <Answer
        eyebrow="Connection outlook"
        big={B ? (B.perM3[1] < calc.tariff + inputs0(local, dischargePct) ? "Yes" : B.perM3[0] < calc.tariff + inputs0(local, dischargePct) ? "Maybe" : "Not yet") : "No"}
      >
        {B && candidate
          ? `${candidate.p.name}, ${fmt1.format(calc.distanceKm)} km away, could supply ${fmt.format(B.coverage * 100)}% of your water for €${fmt2.format(B.perM3[0])}–${fmt2.format(B.perM3[1])}/m³, against €${fmt2.format(A.perM3[0])} today.`
          : `No plant with spare recycled water within ${SEARCH_KM} km.`}
        {confidence}
      </Answer>
    ) : (
      <Answer eyebrow="Economic outlook" big={calc.cheapest === "A" ? "Keep mains water for now" : `Cheapest: ${names[calc.cheapest as "B" | "C"]}`}>
        {calc.cheapest === "A"
          ? "Neither recycled water nor on-site reuse beats your current bill under these assumptions."
          : `Saves about ${eurK(Math.max(0, saving[0]!))}–${eurK(Math.max(0, saving[1]!))} a year compared with today.`}
        {confidence}
      </Answer>
    );

  if (view === "overview") return <section className="mt-5 space-y-5">{answer}
    <div className="grid grid-cols-2 gap-5 border-y py-5"><div><p className="label-caps">Indicative demand · our estimate</p><p className="tnum mt-1 text-xl font-semibold">{fmt.format(Q / 365)} <span className="text-xs font-normal text-muted-foreground">m³/day</span></p></div><div><p className="label-caps">Delivered-water cost · modelled</p><p className="mt-1 text-lg font-semibold">{deliveredCost}</p></div><div><p className="label-caps">Nearest candidate</p><p className="mt-1 text-sm font-medium">{candidate?.p.name ?? "None within 30 km"}</p></div><div><p className="label-caps">Straight-line distance</p><p className="tnum mt-1 text-sm font-medium">{candidate ? `${fmt1.format(candidate.d)} km` : "Not available"}</p></div></div>
    <div><p className="label-caps">Main blocker</p><p className="mt-1 text-sm">{calc.cheapest === "A" ? "Cost exceeds the current bill. Confirm your tariff and shorten the route, or test shared infrastructure." : "Firm demand, water quality and the pipe route need validation."}</p></div>
    <div className="border-l-2 border-primary pl-4"><p className="label-caps">Recommended next step</p><p className="mt-1 text-sm font-medium">Confirm annual demand and water-quality requirements with the site team.</p></div>
    {focus === "q5" && <FuturePanel inputs={calc.future} />}
  </section>;
  return (
    <section className="mt-4">
      <div className="mb-3">{answer}</div>
      {focus === "q5" && (
        <div className="mb-5"><FuturePanel inputs={calc.future} /></div>
      )}
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-medium">Compare the three options</h3>
        <span className="label-caps">benchmark ranges, not a design</span>
      </div>

      <div className="border-y py-4">
        <p className="label-caps flex items-center gap-1.5">Opportunity cost of waiting <SourceInfo id="costs" quality="modelled" /></p>
        <p className="tnum mt-1 text-2xl font-medium">
          {calc.opp[1] <= 0 ? "None" : `${eurK(Math.max(0, calc.opp[0]))}–${eurK(calc.opp[1])}`}
          <span className="ml-1 text-sm font-normal text-muted-foreground">/ yr</span>
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Status quo minus the cheapest alternative{calc.lossA > 0 ? ", plus drought losses avoided" : ""}.
        </p>
      </div>

      <div className="mt-3">
        <RangeBars rows={rows} tariff={calc.tariff} max={max} />
        <p className="text-[11px] text-muted-foreground">Effective € per m³ of demand, low–high. Line = today's tariff{tariffShock !== "0" ? ` +${tariffShock}%` : ""}.</p>
      </div>

      <Details label="What if… adjust scenarios"><div className="mt-4 space-y-3">
        <p className="text-sm font-medium">What if…</p>
        <div className="flex items-center justify-between gap-2">
          <span className="label-caps">Water price rises</span>
          <ToggleGroup type="single" size="sm" variant="outline" value={tariffShock} onValueChange={(v) => v && setTariffShock(v)}>
            {["0", "25", "50"].map((v) => <ToggleGroupItem key={v} value={v} className="h-7 px-2.5 text-xs">+{v}%</ToggleGroupItem>)}
          </ToggleGroup>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="label-caps">Electricity</span>
          <ToggleGroup type="single" size="sm" variant="outline" value={elec} onValueChange={(v) => v && setElec(v as typeof elec)}>
            {(["low", "base", "high"] as const).map((v) => <ToggleGroupItem key={v} value={v} className="h-7 px-2.5 text-xs capitalize">{v}</ToggleGroupItem>)}
          </ToggleGroup>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="label-caps flex items-center gap-1.5">Drought phase <SourceInfo id="drought" date={cur?.date} /></span>
          <Select value={phaseOverride} onValueChange={(v) => setPhaseOverride(v as Phase | "current")} disabled={replay}>
            <SelectTrigger className="h-7 w-44 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current: {drought.isLoading || restriction.isLoading ? "loading" : cur ? cur.phase : "unknown"}</SelectItem>
              {PHASES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="replay" className="label-caps">Replay 2023</Label>
          <Switch id="replay" checked={replay} onCheckedChange={setReplay} />
        </div>
        {replay && calc.days2023 && (
          <p className="rounded-sm border bg-muted/40 p-2 text-[11px] text-muted-foreground">
            2023 in {company.municipi || "this municipality"}: {fmt.format(calc.days2023.alert)} days alert, {fmt.format(calc.days2023.exceptional)} exceptional, {fmt.format(calc.days2023.emergency)} emergency.
            Lost value: <span className="tnum text-foreground">{eurK(calc.lossA)}</span> under A,{" "}
            {B && <><span className="tnum text-foreground">{eurK(calc.lossB)}</span> under B, </>}
            <span className="tnum text-foreground">{eurK(calc.lossC)}</span> under C.
            {!events && " No drought record for this municipality (internal basins only)."}
          </p>
        )}
      </div></Details>

      <table className="mt-4 w-full text-xs">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="pb-1 font-normal" />
            <th className="pb-1 text-right font-normal">A</th>
            <th className="pb-1 text-right font-normal">B</th>
            <th className="pb-1 text-right font-normal">C</th>
          </tr>
        </thead>
        <tbody className="tnum">
          <tr className="border-t"><td className="py-1.5 text-muted-foreground">€ per m³</td><td className="text-right">{fmtR(A.perM3, fmt2.format)}</td><td className="text-right">{B ? fmtR(B.perM3, fmt2.format) : "–"}</td><td className="text-right">{fmtR(C.perM3, fmt2.format)}</td></tr>
          <tr className="border-t"><td className="py-1.5 text-muted-foreground">Annual cost</td><td className="text-right">{fmtR(A.annualCost, eurK)}</td><td className="text-right">{B ? fmtR(B.annualCost, eurK) : "–"}</td><td className="text-right">{fmtR(C.annualCost, eurK)}</td></tr>
          <tr className="border-t"><td className="py-1.5 text-muted-foreground">Capex</td><td className="text-right">–</td><td className="text-right">{B ? fmtR(B.capex, eurK) : "–"}</td><td className="text-right">{fmtR(C.capex, eurK)}</td></tr>
          <tr className="border-t"><td className="py-1.5 text-muted-foreground">Payback, yr</td><td className="text-right">–</td><td className="text-right">{B?.payback ? fmtR(B.payback, (n) => (Number.isFinite(n) ? fmt1.format(n) : "never")) : "never"}</td><td className="text-right">{C.payback ? fmtR(C.payback, (n) => (Number.isFinite(n) ? fmt1.format(n) : "never")) : "never"}</td></tr>
          {calc.lossA > 0 && (
            <tr className="border-t"><td className="py-1.5 text-muted-foreground">Drought loss</td><td className="text-right">{eurK(calc.lossA)}</td><td className="text-right">{B ? eurK(calc.lossB) : "–"}</td><td className="text-right">{eurK(calc.lossC)}</td></tr>
          )}
        </tbody>
      </table>

      <div className="mt-4 space-y-1.5 text-xs">
        <p className="label-caps">B · nearest suitable plant</p>
        {candidate ? (
          <>
            <button className="font-medium underline-offset-2 hover:underline" onClick={() => select({ kind: "wwtp", id: candidate.p.id })}>
              {candidate.p.name}
            </button>
            {candidate.p.supply.reuseReady ? <span className="ml-1.5 text-muted-foreground">reuse-ready</span> : <span className="ml-1.5 text-muted-foreground">needs polishing</span>}
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-muted-foreground">
              <span>Pipe distance</span><span className="tnum text-right text-foreground">{fmt1.format(calc.distanceKm)} km</span>
              <span className="flex items-center gap-1">Lift <SourceInfo id="meteo" note="Elevation difference plus friction allowance." /></span><span className="tnum text-right text-foreground">{elev.isLoading ? "…" : `${fmt.format(calc.liftM)} m`}</span>
              <span className="flex items-center gap-1">Available <SourceInfo id="eea" quality={candidate.p.supply.actualQuality} /></span><span className="tnum text-right text-foreground">{fmt.format(candidate.p.supply.availableReclaimed)} m³/day</span>
              <span>Demand covered</span><span className="tnum text-right text-foreground">{fmt.format((B?.coverage ?? 0) * 100)}%</span>
            </div>
          </>
        ) : (
          <p className="text-muted-foreground">No plant with available reclaimed water within {SEARCH_KM} km.</p>
        )}
        <p className="label-caps pt-2">C · on-site reuse</p>
        <p className="text-muted-foreground">
          Recycles {fmt.format(settings.recoveryRate[0] * 100)}–{fmt.format(settings.recoveryRate[1] * 100)}% of demand. On-site reuse cuts both purchased water and discharge: a double saving.
        </p>
      </div>

      <Details label="Adjust assumptions & your site facts"><div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium">Your site facts</p>
          <QualityBadge q={userQ != null ? "your figure" : "estimate"} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NumField label="Demand m³/yr" step={1000} value={Math.round(Q)} onChange={(n) => setDemandOverride(company.id, n)} />
          <NumField label="Tariff €/m³" value={local.tariff} onChange={(n) => setLocal({ ...local, tariff: n })} />
          <NumField label="Discharge charge €/m³" value={local.dischargeCharge} onChange={(n) => setLocal({ ...local, dischargeCharge: n })} />
          <NumField label="Discount rate" value={local.rate} onChange={(n) => setLocal({ ...local, rate: n })} />
          <NumField label="Lifetime, years" step={1} value={local.years} onChange={(n) => setLocal({ ...local, years: Math.max(1, n) })} />
          <NumField label="Share discharged %" step={5} value={dischargePct} onChange={(n) => setDischargePct(Math.min(100, n))} />
          <div className="col-span-2 space-y-1">
            <Label className="text-[11px] font-normal text-muted-foreground">Wastewater type (sets on-site treatment cost)</Label>
            <Select value={effluent} onValueChange={(v) => setEffluent(v as keyof typeof EFFLUENT)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(EFFLUENT) as (keyof typeof EFFLUENT)[]).map((k) => <SelectItem key={k} value={k}>{EFFLUENT[k].label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        {userQ != null && (
          <button className="mt-2 text-[11px] text-muted-foreground underline" onClick={() => setDemandOverride(company.id, null)}>
            Reset demand to sector estimate ({fmt.format(sectorQ)} m³/yr)
          </button>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">Defaults are assumptions: tariff is the INE Spain average; other ranges are in settings.</p>
      </div></Details>
      {focus !== "q5" && (
        <Details label="Show future exposure to 2050">
          <div className="mt-3"><FuturePanel inputs={calc.future} /></div>
        </Details>
      )}
    </section>
  );
}

const inputs0 = (l: { dischargeCharge: number }, pct: number) => l.dischargeCharge * (pct / 100);
