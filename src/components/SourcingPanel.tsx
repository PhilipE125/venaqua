// Water sourcing: the industrial buyer's five questions, answered top to bottom for one company.
// Every figure comes from a loaded dataset, a cited setting or the user; missing data says so.
import { ArrowRight, Pencil, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { crf, defaultEffluent, droughtLoss, EFFLUENT, evaluateOptions, mid, pumpingKWhPerM3} from "@/lib/costs";
import { droughtRecordLabel, GROWTH, projectFuture } from "@/lib/projection";
import {
  eurK, fmt, fmt1, fmt2, SUPPLY_SEARCH_KM, useClusters, useDrought, useElevation, usePratYearly, useRegen, useRegenHistory,
  useReservoirMonthly, useRestriction, useRoadRoute, useSourcing, useStress, type SupplyCandidate,
} from "@/lib/queries";
import { muniKey, normalize, sectorById } from "@/lib/sectors";
import { META } from "@/lib/sources/contract";
import { currentPhase, type DroughtEvent, type Phase } from "@/lib/sources/drought";
import { GRAVITE_LABEL } from "@/lib/sources/vigieau";
import { useApp, useScenarioState } from "@/lib/state";
import type { Company, ReuseByUse } from "@/lib/types";
import { QualityBadge, SourceInfo } from "./SourceInfo";

const PHASE_COLOR: Record<Phase, string> = {
  normal: "var(--muted)",
  "pre-alert": "color-mix(in oklab, var(--warning) 45%, transparent)",
  alert: "var(--warning)",
  exceptional: "color-mix(in oklab, var(--destructive) 65%, transparent)",
  emergency: "var(--destructive)",
};
const PHASE_LABEL: Record<Phase, string> = { normal: "Normal", "pre-alert": "Pre-alert", alert: "Alert", exceptional: "Exceptional", emergency: "Emergency" };
const SCENARIO_PHASES: Phase[] = ["normal", "alert", "exceptional", "emergency"];
const USES: [keyof ReuseByUse, string][] = [["agricultural", "Agricultural"], ["environmental", "Environmental"], ["urban", "Urban"], ["recreational", "Recreational"], ["industrial", "Industrial"]];

function Block({ n, title, note, children }: { n: number; title: string; note?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-t py-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold"><span className="tnum mr-1.5 text-muted-foreground">{n}</span>{title}</h3>
        {note && <span className="label-caps flex items-center gap-1">{note}</span>}
      </div>
      {children}
    </section>
  );
}

function Kv({ k, v }: { k: React.ReactNode; v: React.ReactNode }) {
  return <div className="flex justify-between gap-3 py-1 text-xs"><span className="text-muted-foreground">{k}</span><span className="tnum text-right">{v}</span></div>;
}

export function SourcingPanel({ company }: { company: Company }) {
  const { settings, region, select, demandOverride, setDemandOverride } = useApp();
  const { candidates, selected, choose, q, isLoading } = useSourcing(company);
  const road = useRoadRoute(selected?.p, company);
  const elev = useElevation(selected?.p, company);
  const drought = useDrought();
  const restriction = useRestriction(company);
  const clusters = useClusters();
  const [, setHover] = useScenarioState("sourcing:hoverCluster", false);
  // Same scenario keys as the full cost-benefit, so the numbers match it.
  const [local] = useScenarioState(`${company.id}:local`, { tariff: settings.tariffs[region].supply, dischargeCharge: settings.tariffs[region].discharge, rate: settings.rate, years: settings.years });
  const [tariffShock] = useScenarioState(`${company.id}:tariffShock`, "0");
  const [elec] = useScenarioState<"low" | "base" | "high">(`${company.id}:elec`, "base");
  const [effluent] = useScenarioState<keyof typeof EFFLUENT>(`${company.id}:effluent`, defaultEffluent(company.sector));
  const [dischargePct] = useScenarioState(`${company.id}:dischargePct`, 80);
  const [phase, setPhase] = useScenarioState<Phase>(`${company.id}:sourcingPhase`, "exceptional");

  const events: DroughtEvent[] | undefined = region === "fr" ? (restriction.data ? [restriction.data] : undefined) : drought.data?.byMuni.get(muniKey(company.municipi));
  const userQ = demandOverride[company.id];

  const calc = useMemo(() => {
    const tariff = local.tariff * (1 + Number(tariffShock) / 100);
    const distanceKm = selected ? (road.data?.km ?? selected.d * settings.detourFactor) : 0;
    const heightM = elev.data ? elev.data.b - elev.data.a : null;
    const liftM = (heightM != null ? Math.max(0, heightM) : 0) + (settings.frictionPer10km * distanceKm) / 10;
    const r = evaluateOptions({
      q, tariff, dischargeCharge: local.dischargeCharge * (dischargePct / 100), rate: local.rate, years: local.years,
      electricity: settings.electricity[elec],
      plant: selected ? { distanceKm, liftM, reuseReady: selected.p.supply.reuseReady, availableM3PerDay: selected.p.supply.availableReclaimed } : null,
      effluentK: EFFLUENT[effluent].k,
      cut: settings.droughtCut[currentPhase(events)?.phase ?? "normal"],
      events,
      s: settings,
    });
    const f = projectFuture(r.future, GROWTH.mid);
    return { ...r, f, distanceKm, heightM, liftM, tariff, k: crf(local.rate, local.years) };
  }, [q, local, tariffShock, elec, effluent, dischargePct, selected, road.data, elev.data, settings, events]);

  const { A, B, C } = calc;
  const statusQuo = A.perM3[0];

  // Breakdown of €/m³ delivered (mid values) for the stacked bar.
  const parts = useMemo(() => {
    if (!B || !selected || B.deliverable <= 0) return null;
    const kwh = pumpingKWhPerM3(calc.liftM, settings.pumpEfficiency);
    return [
      { key: "Pipe", v: (mid(B.capex) * calc.k) / B.deliverable, c: "var(--foreground)" },
      { key: "Treatment", v: selected.p.supply.reuseReady ? 0 : mid(settings.polishing), c: "var(--chart-2)" },
      { key: "Reclaimed water", v: mid(settings.reclaimedPrice), c: "var(--primary)" },
      { key: "Pumping", v: kwh * settings.electricity[elec], c: "var(--chart-4)" },
    ];
  }, [B, selected, calc.liftM, calc.k, settings, elec]);

  const cluster = useMemo(() => clusters.find((c) => c.companyIds.includes(company.id)), [clusters, company.id]);

  return (
    <div className="text-sm">
      {/* 0. Answer first */}
      <div className="rounded-md border bg-muted/40 p-3">
        <p className="label-caps">The answer</p>
        {isLoading ? <Skeleton className="mt-2 h-12 w-full" /> : B && selected ? (
          <>
            <p className="mt-1 leading-snug">
              Connecting to <strong>{selected.p.name}</strong> ({fmt1.format(calc.distanceKm)} km {road.data ? "by road" : "estimated"}) could {B.coverage < 0.999 ? `supply ${fmt.format(B.coverage * 100)}% of your water` : "supply your water"} at{" "}
              <strong className="tnum">€{fmt2.format(B.perM3[0])}-{fmt2.format(B.perM3[1])}/m³</strong>, against <strong className="tnum">€{fmt2.format(statusQuo)}</strong> today.{" "}
              {calc.f.payB == null ? "It does not pay off by 2050 at 3% yearly tariff growth." : calc.f.payB <= 2026 ? "It pays off from now." : <>It pays off from <strong className="text-flip">{calc.f.payB}</strong>.</>}
            </p>
            <div className="tnum mt-2 grid grid-cols-2 gap-2">
              <div><p className="label-caps">Recycled, delivered</p><p className="text-xl font-semibold">€{fmt2.format(mid(B.perM3))}</p></div>
              <div><p className="label-caps">Mains today</p><p className="text-xl font-semibold">€{fmt2.format(statusQuo)}</p></div>
            </div>
          </>
        ) : (
          <p className="mt-1 leading-snug">
            No treatment plant with spare water within {SUPPLY_SEARCH_KM} km. On-site reuse would cost about <strong className="tnum">€{fmt2.format(C.perM3[0])}-{fmt2.format(C.perM3[1])}/m³</strong> against <strong className="tnum">€{fmt2.format(statusQuo)}</strong> today
            {calc.f.payC != null ? <>, paying off from <strong className="text-flip">{calc.f.payC}</strong>.</> : ", and does not pay off by 2050."}
          </p>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">Screening estimate: demand {userQ != null ? "is your figure" : "is an estimate"}, costs use the settings and their sources.</p>
      </div>

      {/* 1. Water need */}
      <Block n={1} title="Your water need" note={<>{userQ != null ? "your figure" : "estimate"} <SourceInfo id="demand" /></>}>
        <DemandField value={q / 365} isUser={userQ != null} onSave={(v) => setDemandOverride(company.id, v == null ? null : v * 365)} />
        <p className="mt-1 text-xs text-muted-foreground">
          {userQ != null ? "Entered by you." : `Estimate for a typical ${sectorById[company.sector].label.toLowerCase()} site, not measured. Enter your own figure.`}
        </p>
        {company.sendsToPlant && <p className="mt-2 text-xs"><span className="font-medium">Already sends wastewater to a treatment plant</span> <span className="text-muted-foreground">(EU industrial register, 2023; the plant is not named).</span></p>}
      </Block>

      {/* 2. Candidates */}
      <Block n={2} title="Where you could source from" note={`within ${SUPPLY_SEARCH_KM} km`}>
        {isLoading ? <Skeleton className="h-24 w-full" /> : candidates.length === 0 ? (
          <p className="text-xs text-muted-foreground">No plant with spare water within {SUPPLY_SEARCH_KM} km.</p>
        ) : (
          <ul className="space-y-1">
            {candidates.map((c) => {
              const on = c.p.id === selected?.p.id;
              return (
                <li key={c.p.id}>
                  <button onClick={() => choose(c.p.id)} className={`w-full rounded-md border px-2.5 py-2 text-left text-xs transition-colors ${on ? "border-primary bg-primary/5" : "hover:bg-accent"}`}>
                    <div className="flex justify-between gap-2"><span className="truncate font-medium">{c.p.name}</span><span className="tnum shrink-0">€{fmt2.format(c.cost)}/m³</span></div>
                    <div className="tnum mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-muted-foreground">
                      <span>{c.p.municipi}</span>
                      <span>{fmt1.format(c.d)} km straight{on && road.data ? ` · ${fmt1.format(road.data.km)} km road` : ""}</span>
                      <span>{fmt.format(c.p.supply.availableReclaimed)} m³/day spare</span>
                      <span>{c.p.supply.reuseReady ? "Reuse-ready" : "Needs extra treatment"}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-1.5 text-[11px] text-muted-foreground">Ranked by pipe and treatment cost per m³ (straight line × detour). Reuse-ready means tertiary treatment with filtration or UV, or a recycling plant in the town.</p>
      </Block>

      {/* 3. Connection */}
      {selected && B && (
        <Block n={3} title="The connection" note={<>estimate <SourceInfo id="route" /></>}>
          <Kv k="Length" v={road.isLoading ? "…" : `${road.data ? `${fmt1.format(road.data.km)} km by road · ` : ""}${fmt1.format(selected.d)} km straight`} />
          <Kv k="Height difference" v={elev.isLoading ? "…" : calc.heightM != null ? `${calc.heightM >= 0 ? "+" : ""}${fmt.format(calc.heightM)} m` : "not available"} />
          <Kv k="Pumping energy" v={`${fmt2.format(B.kwhPerM3)} kWh/m³`} />
          <Kv k="Pipe capex" v={`${eurK(B.capex[0])}-${eurK(B.capex[1])}`} />
          {parts && (
            <div className="mt-2">
              <div className="flex h-3 w-full overflow-hidden rounded-sm">
                {parts.map((p) => <div key={p.key} title={`${p.key}: €${fmt2.format(p.v)}/m³`} style={{ width: `${(p.v / parts.reduce((s, x) => s + x.v, 0)) * 100}%`, background: p.c }} />)}
              </div>
              <div className="tnum mt-1 grid grid-cols-2 gap-x-3 text-[11px] text-muted-foreground">
                {parts.map((p) => <span key={p.key} className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm" style={{ background: p.c }} />{p.key} €{fmt2.format(p.v)}</span>)}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Per m³ delivered, mid values.</p>
            </div>
          )}
          {cluster && cluster.companyIds.length > 1 && (
            <p className="mt-2 cursor-default rounded-sm border border-dashed px-2 py-1.5 text-xs" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
              Share with {cluster.companyIds.length - 1} neighbours: pipe cost <span className="tnum font-medium">€{fmt2.format(cluster.costPerM3[0])}-{fmt2.format(cluster.costPerM3[1])}/m³</span> per member.
            </p>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">Road route used as an estimate of the pipe path.</p>
        </Block>
      )}

      {/* 4. Spare water */}
      {selected && <SpareWater sourcing={selected} demand={q / 365} />}

      {/* 5. Drought */}
      <Block n={5} title="Drought: now, scenario and history">
        <DroughtNow company={company} events={events} />
        <div className="mt-3">
          <p className="label-caps mb-1">Scenario</p>
          <ToggleGroup type="single" size="sm" variant="outline" value={phase} onValueChange={(v) => v && setPhase(v as Phase)} className="justify-start">
            {SCENARIO_PHASES.map((p) => <ToggleGroupItem key={p} value={p} className="h-7 px-2 text-[11px]">{PHASE_LABEL[p]}</ToggleGroupItem>)}
          </ToggleGroup>
          {(() => {
            const cut = settings.droughtCut[phase];
            const cover = B?.coverage ?? 0;
            const lost = droughtLoss(q, cut, settings.valuePerM3Lost);
            const lostWith = droughtLoss(q, cut, settings.valuePerM3Lost, cover);
            return (
              <div className="mt-2">
                <Kv k="Cut to mains water for industry" v={`${fmt.format(cut * 100)}% · ${fmt.format((q / 365) * cut)} m³/day`} />
                <Kv k="Value at risk if it lasted a year" v={eurK(lost)} />
                <Kv k={B ? "With the recycled connection" : "With a recycled connection"} v={B ? `${eurK(lostWith)} (covers ${fmt.format(cover * 100)}%)` : "no plant in reach"} />
                <p className="mt-1 text-[11px] text-muted-foreground">Cuts and €{fmt.format(settings.valuePerM3Lost)} lost per m³ are settings (assumptions). Recycled water may also be prioritised for other uses in a drought: El Prat sent most of its reclaimed water back to the Llobregat for drinking-water supply. Whether industrial reuse is exempt from cuts is to confirm with the water authority.</p>
              </div>
            );
          })()}
        </div>
        <DroughtHistory events={events} />
      </Block>

      <div className="border-t pt-3">
        <Button asChild className="w-full"><Link to="/analysis" search={{ kind: "company", id: company.id }} resetScroll={false}>Full cost-benefit<ArrowRight /></Link></Button>
        <button className="mt-2 w-full text-center text-[11px] text-muted-foreground underline" onClick={() => select(null)}>Close and return to the map</button>
      </div>
    </div>
  );
}

function DemandField({ value, isUser, onSave }: { value: number; isUser: boolean; onSave: (v: number | null) => void }) {
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState(String(Math.round(value)));
  useEffect(() => setDraft(String(Math.round(value))), [value]);
  if (!edit) return (
    <button onClick={() => setEdit(true)} className="group flex items-baseline gap-1.5 text-left">
      <span className="tnum text-2xl font-semibold">{fmt.format(value)}</span><span className="text-sm text-muted-foreground">m³/day</span>
      <Pencil className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
    </button>
  );
  return (
    <form className="flex items-center gap-1.5" onSubmit={(e) => { e.preventDefault(); const n = Number(draft); if (Number.isFinite(n) && n > 0) onSave(n); setEdit(false); }}>
      <Input autoFocus type="number" min={1} value={draft} onChange={(e) => setDraft(e.target.value)} className="tnum h-8 w-28" aria-label="Water demand in m³ per day" />
      <span className="text-xs text-muted-foreground">m³/day</span>
      <Button type="submit" size="sm" className="h-8">Save</Button>
      {isUser && <Button type="button" size="sm" variant="ghost" className="h-8" onClick={() => { onSave(null); setEdit(false); }}>Use estimate</Button>}
      <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEdit(false)} aria-label="Cancel"><X className="h-3.5 w-3.5" /></Button>
    </form>
  );
}

function SpareWater({ sourcing, demand }: { sourcing: SupplyCandidate; demand: number }) {
  const regen = useRegen();
  const hist = useRegenHistory();
  const p = sourcing.p;
  const s = p.supply;
  const g = regen.data?.features.find((x) => normalize(x.municipi) === normalize(p.municipi));
  const total = Math.max(s.actualFlow, s.alreadyReused + s.availableReclaimed, 1);
  const spare = s.availableReclaimed;
  const share = spare > 0 ? demand / spare : Infinity;
  const used = g ? USES.map(([k, label]) => ({ label, v: g.reuseByUse[k] / 365 })).filter((x) => x.v > 0) : [{ label: "Already reused", v: s.alreadyReused }];
  const series = g ? hist.data?.get(g.id) : undefined;
  const pct = (v: number) => `${Math.max(0, (v / total) * 100)}%`;
  return (
    <Block n={4} title="Spare water at the plant" note={<><QualityBadge q={s.actualQuality} /></>}>
      <div className="relative flex h-5 w-full overflow-hidden rounded-sm bg-muted">
        {used.map((u, i) => <div key={u.label} title={`${u.label}: ${fmt.format(u.v)} m³/day`} style={{ width: pct(u.v), background: `color-mix(in oklab, var(--muted-foreground) ${70 - i * 10}%, transparent)` }} />)}
        <div title={`Spare: ${fmt.format(spare)} m³/day`} style={{ width: pct(spare), background: "color-mix(in oklab, var(--primary) 35%, transparent)" }} />
        {spare > 0 && <div className="absolute top-0 h-full border-r-2 border-flip" style={{ left: `calc(${pct(used.reduce((a, u) => a + u.v, 0))} + ${Math.min(1, share) * (spare / total) * 100}%)` }} title={`Your demand: ${fmt.format(demand)} m³/day`} />}
      </div>
      <div className="tnum mt-1 flex justify-between text-[11px] text-muted-foreground">
        <span>Treated {fmt.format(s.actualFlow)} · reused {fmt.format(s.alreadyReused)} · spare {fmt.format(spare)} m³/day</span>
      </div>
      <p className="mt-1.5 text-xs">
        {s.suspect ? <span className="text-destructive">Flow data looks wrong ({s.suspect}), so spare volume is set to zero.</span>
          : spare > 0 ? <>You would take <strong className="tnum text-flip">{fmt.format(share * 100)}%</strong> of the spare water.</> : "No spare water reported."}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Treated flow: {s.actualQuality === "measured" ? `EEA treated volume (2022, code ${s.eeaCode})` : p.national ? "our estimate from population capacity" : "our estimate from the ACA design flow"}.
        Reuse: {g ? `ACA regeneration register, ${g.year}, split by use` : p.national ? "EEA reported reuse" : "no regeneration plant in this town"}. The orange mark is your demand.
      </p>
      {series && series.length > 1 && (
        <div className="mt-2 h-20">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series.map((y) => ({ year: y.year, total: y.total, industrial: y.byUse.industrial }))}>
              <XAxis dataKey="year" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v) => `${fmt.format(Number(v))} m³/yr`} />
              <Bar dataKey="total" name="Reused" fill="var(--muted-foreground)" fillOpacity={0.5} />
              <Bar dataKey="industrial" name="Industrial" fill="var(--primary)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {series && series.length > 1 && <p className="flex items-center gap-1 text-[11px] text-muted-foreground">Reused per year, accent = industrial <SourceInfo id="regenHistory" /></p>}
    </Block>
  );
}

function DroughtNow({ company, events }: { company: Company; events: DroughtEvent[] | undefined }) {
  const { region } = useApp();
  const restriction = useRestriction(company);
  const { lowWater } = useStress();
  if (region === "fr") {
    const lv = restriction.data?.level;
    return <p className="text-xs"><span className="text-muted-foreground">Now (VigiEau): </span>{restriction.isLoading ? "loading…" : restriction.data ? (lv ? GRAVITE_LABEL[lv] : "No restriction in force") : "not available"}</p>;
  }
  if (region === "de") {
    return <p className="text-xs text-muted-foreground">No site-level drought data in Germany. {lowWater != null ? `Nationally, ${fmt.format(lowWater * 100)}% of federal river gauges are at low water.` : ""}</p>;
  }
  const cur = currentPhase(events);
  return (
    <p className="flex items-center gap-1.5 text-xs">
      <span className="text-muted-foreground">Now in {company.municipi}:</span>
      {cur ? <><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: PHASE_COLOR[cur.phase] }} /><span className="font-medium">{PHASE_LABEL[cur.phase]}</span><span className="text-muted-foreground">since {cur.date}</span></> : <span>not available</span>}
      <SourceInfo id="drought" />
    </p>
  );
}

function DroughtHistory({ events }: { events: DroughtEvent[] | undefined }) {
  const { region } = useApp();
  const res = useReservoirMonthly();
  const prat = usePratYearly();
  const band = useMemo(() => {
    if (!events?.length) return [];
    const start = Date.UTC(2021, 0, 1);
    const end = Date.now();
    const out: { phase: Phase; from: number; to: number }[] = [];
    let phase: Phase = "normal";
    let cursor = start;
    for (const e of events) {
      const t = Date.parse(e.date);
      if (t > cursor && t <= end) { out.push({ phase, from: cursor, to: t }); cursor = t; }
      phase = e.phase;
    }
    out.push({ phase, from: cursor, to: end });
    return out.map((s) => ({ ...s, w: (s.to - s.from) / (end - start) }));
  }, [events]);
  if (region === "de" || region === "fr") return <p className="mt-3 text-xs text-muted-foreground">Drought history for this region is not loaded yet.</p>;
  return (
    <div className="mt-4 space-y-3">
      <p className="label-caps">History</p>
      <div>
        <p className="mb-1 flex items-center gap-1 text-[11px] text-muted-foreground">Drought phase in the town, 2021 to today <SourceInfo id="drought" /></p>
        {band.length ? (
          <div className="flex h-3 w-full overflow-hidden rounded-sm">{band.map((b, i) => <div key={i} title={`${PHASE_LABEL[b.phase]} · ${new Date(b.from).toISOString().slice(0, 10)}`} style={{ width: `${b.w * 100}%`, background: PHASE_COLOR[b.phase] }} />)}</div>
        ) : <p className="text-[11px]">Not available for this town.</p>}
        <div className="tnum mt-0.5 flex justify-between text-[10px] text-muted-foreground"><span>2021</span><span>today</span></div>
        <p className="mt-0.5 text-[10px] text-muted-foreground">Future projections use the {droughtRecordLabel(events)}.</p>
      </div>
      <div>
        <p className="mb-1 flex items-center gap-1 text-[11px] text-muted-foreground">Internal-basin reservoir fill since 2000, % <SourceInfo id="reservoirsMonthly" /></p>
        {res.isLoading ? <Skeleton className="h-20 w-full" /> : res.data ? (
          <div className="h-20">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={res.data.series} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 10 }} interval={59} tickFormatter={(m: string) => m.slice(0, 4)} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v) => `${fmt1.format(Number(v))}%`} />
                <Area type="monotone" dataKey="value" name="Fill" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="text-[11px]">Not available.</p>}
        <p className="text-[10px] text-muted-foreground">The dips in 2007-08 and 2022-24 are the two big droughts.</p>
      </div>
      <div>
        <p className="mb-1 flex items-center gap-1 text-[11px] text-muted-foreground">El Prat: pumped for reuse vs sent to the river, m³/day per year <SourceInfo id="pratYearly" /></p>
        {prat.isLoading ? <Skeleton className="h-20 w-full" /> : prat.data ? (
          <div className="h-20">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={prat.data.series}>
                <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v) => `${fmt.format(Number(v))} m³/day`} />
                <Bar dataKey="reuse" name="Reuse" stackId="a" fill="var(--primary)" />
                <Bar dataKey="river" name="To river" stackId="a" fill="var(--muted-foreground)" fillOpacity={0.35} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="text-[11px]">Not available.</p>}
        <p className="text-[10px] text-muted-foreground">The 2020-21 river readings look much higher than other years and may not be comparable across years.</p>
      </div>
      <p className="text-xs">In the 2023-24 drought, industry in Catalonia faced cuts of 15% (exceptional) and 25% (emergency). <a className="underline" href={META.droughtCases.url} target="_blank" rel="noreferrer">Source</a></p>
    </div>
  );
}

