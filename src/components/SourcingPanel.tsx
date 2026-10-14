// Water sourcing for one company: build your own reuse plant or connect, what each costs, and what
// it exposes the site to. Every figure comes from a loaded dataset, a setting or the user, and is
// underlined in its evidence style (solid measured, dashed modelled, dotted assumption).
import { ArrowRight, Download, Minus, Pencil, Plus, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { crf, defaultEffluent, droughtLoss, EFFLUENT, mid, pumpingKWhPerM3, type Range } from "@/lib/costs";
import { droughtRecordLabel, GROWTH, historicFrequencies, projectFuture } from "@/lib/projection";
import { evaluateCandidate, type CompanyEvalInput } from "@/lib/companyEval";
import { comarcaKey, footprint, mainsShare, type Choice } from "@/lib/footprint";
import {
  eurK, fmt, fmt1, fmt2, SUPPLY_SEARCH_KM, useClusters, useDrought, useElevation, usePratYearly, useRegen, useRegenHistory,
  useReservoirMonthly, useRestriction, useRoadRoute, useSourcing, useStress, useWwtps, type SupplyCandidate,
} from "@/lib/queries";
import { haversineKm } from "@/lib/score";
import {
  monthMedian, riskLevel, sharedOption, sharedPipeShare, sourceStressLevel, verdict, visibilityLevel, weakest, type Level, type OptionCost,
} from "@/lib/screening";
import { muniKey, normalize, sectorById } from "@/lib/sectors";
import { fetchComarcaWater, fetchMuniPrices } from "@/lib/sources/comarcaWater";
import { META, type SourceId } from "@/lib/sources/contract";
import { currentPhase, type DroughtEvent, type Phase } from "@/lib/sources/drought";
import { GRAVITE_LABEL, PHASE_OF } from "@/lib/sources/vigieau";
import { useApp, useScenarioState, type Settings } from "@/lib/state";
import type { Company, ReuseByUse } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Figure, QualityBadge, qualityStyle, SourceInfo } from "./SourceInfo";

const PHASE_COLOR: Record<Phase, string> = {
  normal: "var(--muted)",
  "pre-alert": "color-mix(in oklab, var(--warning) 45%, transparent)",
  alert: "var(--warning)",
  exceptional: "color-mix(in oklab, var(--destructive) 65%, transparent)",
  emergency: "var(--destructive)",
};
const PHASE_LABEL: Record<Phase, string> = { normal: "Normal", "pre-alert": "Pre-alert", alert: "Alert", exceptional: "Exceptional", emergency: "Emergency" };
const SCENARIO_PHASES: Phase[] = ["normal", "alert", "exceptional", "emergency"];
const ALL_PHASES: Phase[] = ["normal", "pre-alert", "alert", "exceptional", "emergency"];
const USES: [keyof ReuseByUse, string][] = [["agricultural", "Agricultural"], ["environmental", "Environmental"], ["urban", "Urban"], ["recreational", "Recreational"], ["industrial", "Industrial"]];
const LEVEL_CLS: Record<Level, string> = {
  Low: "bg-muted text-muted-foreground",
  Medium: "bg-[color-mix(in_oklab,var(--warning)_30%,transparent)] text-foreground",
  High: "bg-[color-mix(in_oklab,var(--destructive)_25%,transparent)] text-foreground",
};
const CHOICE_LABEL: Record<Choice, string> = { status: "Status quo", own: "Own plant", connect: "Connect", shared: "Shared pipe" };

const rng = (r: Range, d = fmt2) => `€${d.format(r[0])}-${d.format(r[1])}`;
const dateLong = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

function Kv({ k, v }: { k: React.ReactNode; v: React.ReactNode }) {
  return <div className="flex justify-between gap-3 py-1 text-xs"><span className="text-muted-foreground">{k}</span><span className="tnum text-right">{v}</span></div>;
}

function Section({ value, title, note, children }: { value: string; title: string; note?: React.ReactNode; children: React.ReactNode }) {
  return (
    <AccordionItem value={value}>
      <AccordionTrigger className="py-3 text-sm font-semibold hover:no-underline">
        <span className="flex flex-1 items-baseline justify-between gap-2 pr-2">{title}{note && <span className="label-caps flex items-center gap-1 font-normal">{note}</span>}</span>
      </AccordionTrigger>
      <AccordionContent className="pb-4">{children}</AccordionContent>
    </AccordionItem>
  );
}

export function SourcingPanel({ company }: { company: Company }) {
  const { settings, setSettings, region, select, demandOverride, setDemandOverride } = useApp();
  const { candidates, selected, choose, q, isLoading } = useSourcing(company);
  const road = useRoadRoute(selected?.p, company);
  const elev = useElevation(selected?.p, company);
  const drought = useDrought();
  const restriction = useRestriction(company);
  const clusters = useClusters();
  const wwtps = useWwtps();
  const [, setHover] = useScenarioState("sourcing:hoverCluster", false);
  // Same scenario keys as the full cost-benefit, so the numbers match it.
  const [local, setLocal] = useScenarioState(`${company.id}:local`, { tariff: settings.tariffs[region].supply, dischargeCharge: settings.tariffs[region].discharge, rate: settings.rate, years: settings.years });
  const [tariffShock] = useScenarioState(`${company.id}:tariffShock`, "0");
  const [elec] = useScenarioState<"low" | "base" | "high">(`${company.id}:elec`, "base");
  const [effluent, setEffluent] = useScenarioState<keyof typeof EFFLUENT>(`${company.id}:effluent`, defaultEffluent(company.sector));
  const [dischargePct] = useScenarioState(`${company.id}:dischargePct`, 80);
  const [phase, setPhase] = useScenarioState<Phase>(`${company.id}:sourcingPhase`, "exceptional");
  const [choice, setChoice] = useScenarioState<Choice>(`${company.id}:footprintChoice`, "status");

  const events: DroughtEvent[] | undefined = region === "fr" ? (restriction.data ? [restriction.data] : undefined) : drought.data?.byMuni.get(muniKey(company.municipi));
  const userQ = demandOverride[company.id];
  const demandQ = userQ != null ? "your figure" as const : "assumption" as const;
  const qDay = q / 365;

  const base: Omit<CompanyEvalInput, "plant" | "roadKm" | "heightM"> = useMemo(() => ({
    q, tariff: local.tariff, tariffShockPct: Number(tariffShock), dischargeCharge: local.dischargeCharge, dischargePct,
    rate: local.rate, years: local.years, electricity: settings.electricity[elec], effluent,
    cut: settings.droughtCut[currentPhase(events)?.phase ?? "normal"], events, settings,
  }), [q, local, tariffShock, dischargePct, elec, effluent, events, settings]);

  const heightM = elev.data ? elev.data.b - elev.data.a : null;
  const freq = useMemo(() => historicFrequencies(events), [events]);

  // Each candidate through the same evaluation; the selected one also gets road and height.
  const evals = useMemo(() => new Map(candidates.map((c) => [c.p.id, evaluateCandidate(base, c, c.p.id === selected?.p.id ? { roadKm: road.data?.km ?? null, heightM } : undefined)])), [candidates, base, selected, road.data, heightM]);
  const calc = useMemo(() => {
    const r = evaluateCandidate(base, selected, { roadKm: road.data?.km ?? null, heightM });
    const f = projectFuture(r.future, GROWTH.mid, freq);
    return { ...r, f, k: crf(local.rate, local.years) };
  }, [base, selected, road.data, heightM, freq, local.rate, local.years]);
  const { A, B, C } = calc;
  const statusQuo = A.perM3[0];
  const bill = mid(A.annualCost);
  const recovery = mid(settings.recoveryRate);

  // Shared pipe: the company's cluster, with the user's choice of how many join.
  const cluster = useMemo(() => clusters.find((c) => c.companyIds.includes(company.id) && c.companyIds.length > 1), [clusters, company.id]);
  const [joinRaw, setJoin] = useScenarioState<number | null>(`${company.id}:sharedJoin`, null);
  const members = cluster?.companyIds.length ?? 1;
  const joining = Math.max(1, Math.min(members, joinRaw ?? members));
  const shared = useMemo(() => {
    if (!cluster) return null;
    const plant = wwtps.data?.features.find((p) => p.id === cluster.plantId);
    if (!plant?.supply) return null;
    const cand = { d: haversineKm(plant, company), p: plant as SupplyCandidate["p"] };
    const r = evaluateCandidate(base, cand, plant.id === selected?.p.id ? { roadKm: road.data?.km ?? null, heightM } : undefined);
    if (!r.B) return null;
    const share = sharedPipeShare(qDay, cluster.demand, members, joining);
    const s = sharedOption(r.B, cluster.capex, share, local.rate, local.years, settings.capexGrantShare, q);
    const f = projectFuture({ ...r.future, B: { ...r.future.B!, capex: mid(s.capex) } }, GROWTH.mid, freq);
    return { ...s, coverage: r.B.coverage, payB: f.payB, plantName: plant.name, share };
  }, [cluster, wwtps.data, company, base, selected, road.data, heightM, qDay, members, joining, local.rate, local.years, settings.capexGrantShare, q, freq]);

  const options: OptionCost[] = [
    { key: "own", label: "Own reuse plant", annual: C.annualCost },
    ...(B && selected ? [{ key: "connect" as const, label: `Connect to ${selected.p.name}`, annual: B.annualCost }] : []),
    ...(shared ? [{ key: "shared" as const, label: "Connect, shared pipe", annual: shared.annualCost }] : []),
  ];
  const v = verdict(options, local.rate, local.years);

  // Which assumption moves the cheaper option most: re-run with each input at its low and high end.
  const firmUp = useMemo(() => {
    if (!v?.close) return null;
    const keys: [keyof Settings, string][] = v.best.key === "own"
      ? [["onsiteCapex", "on-site capex"], ["onsiteOpex", "on-site opex"], ["recoveryRate", "recovery rate"]]
      : [["pipeCostPerKm", "pipe cost per km"], ["reclaimedPrice", "reclaimed-water price"], ["polishing", "polishing cost"]];
    const pick = (r: ReturnType<typeof evaluateCandidate>) => mid(v.best.key === "own" ? r.C.annualCost : (r.B?.annualCost ?? [0, 0]));
    let best = keys[0]![1], top = -1;
    for (const [k, label] of keys) {
      const rg = settings[k] as Range;
      const at = (x: number) => pick(evaluateCandidate({ ...base, settings: { ...settings, [k]: [x, x] } }, selected, { roadKm: road.data?.km ?? null, heightM }));
      const sw = Math.abs(at(rg[1]) - at(rg[0]));
      if (sw > top) { top = sw; best = label; }
    }
    return best;
  }, [v, settings, base, selected, road.data, heightM]);

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

  // Exposure per option, used by the summary line and the risk matrix.
  const cols = useMemo(() => {
    const list: { key: Choice; protect: number; mains: number }[] = [{ key: "status", protect: 0, mains: 1 }, { key: "own", protect: recovery, mains: 1 - recovery }];
    if (B) list.push({ key: "connect", protect: B.coverage, mains: 1 - B.coverage });
    if (shared) list.push({ key: "shared", protect: shared.coverage, mains: 1 - shared.coverage });
    return list.map((c) => {
      const expected = ALL_PHASES.reduce((s, p) => s + (freq[p] ?? 0) * droughtLoss(q, settings.droughtCut[p], settings.valuePerM3Lost, c.protect), 0);
      const worst = droughtLoss(q, settings.droughtCut.emergency, settings.valuePerM3Lost, c.protect);
      const price = q * c.mains * (calc.f.tariffFor(2035) - calc.tariff);
      return { ...c, expected, worst, price };
    });
  }, [B, shared, recovery, freq, q, settings, calc.f, calc.tariff]);
  const col = (k: Choice) => cols.find((c) => c.key === k);

  const lossWhy = `Uses €${fmt.format(settings.valuePerM3Lost)} lost per m³ cut and the cut per phase, both settings`;
  const assumptionCount = 9 + (userQ == null ? 1 : 0);
  const dataCount = 2 + (selected ? 1 : 0) + (road.data ? 1 : 0) + (heightM != null ? 1 : 0);

  return (
    <div className="text-sm">
      {/* Answer: build or connect */}
      <div className="rounded-md border bg-muted/40 p-3">
        <p className="label-caps">Build your own or connect?</p>
        {isLoading ? <Skeleton className="mt-2 h-24 w-full" /> : (
          <>
            {v && (
              <p className="mt-1 leading-snug">
                {!B && !shared ? (
                  <>No treatment plant with spare water within {SUPPLY_SEARCH_KM} km, so only your own reuse plant is possible. It would cost <Figure value={`${rng(C.perM3)}/m³`} quality="assumption" source="costs" why="Rests on on-site capex, opex and recovery rate, all benchmark ranges" /> against <Figure value={`€${fmt2.format(statusQuo)}`} quality="measured" source="waterPrices" /> today.</>
                ) : v.close ? (
                  <><strong>Too close to call.</strong> {v.best.label} looks cheapest, but firm up the {firmUp} first.</>
                ) : (
                  <><strong>{v.best.label}</strong> is cheapest, by about <Figure className="font-semibold" value={`${eurK(v.perYear)} a year`} quality="assumption" source="costs" why="Difference of mid annual costs; both rest on cost benchmarks" />, or <Figure value={eurK(v.lifetime)} quality="assumption" source="costs" why={`Discounted over ${local.years} years at ${fmt1.format(local.rate * 100)}%`} /> over {local.years} years at {fmt1.format(local.rate * 100)}% discount.</>
                )}
              </p>
            )}
            {v?.next && !v.close && <p className="mt-1 text-xs text-muted-foreground">{v.next.label} would cost about {eurK(v.perYear)} a year more.</p>}

            <DecisionTable best={v?.close ? undefined : v?.best.key} C={C} B={B} shared={shared} selectedName={selected?.p.name} payC={calc.f.payC} payB={calc.f.payB} recovery={recovery}
              members={members} joining={joining} setJoin={setJoin} onHover={setHover} />
            <RangeBars rows={[
              { label: "Own plant", r: C.perM3 },
              ...(B ? [{ label: "Connect", r: B.perM3 }] : []),
              ...(shared ? [{ label: "Shared", r: shared.perM3 }] : []),
            ]} mains={statusQuo} />
          </>
        )}
        <RestsOn
          count={{ a: assumptionCount, d: dataCount }}
          rows={[
            { k: "Your water need", v: <DemandField value={qDay} isUser={userQ != null} onSave={(x) => setDemandOverride(company.id, x == null ? null : x * 365)} compact />, q: demandQ, src: "demand" },
            { k: "Mains tariff €/m³", v: <NumEdit value={local.tariff} onSave={(x) => setLocal({ ...local, tariff: x })} />, q: "measured", src: "waterPrices" },
            { k: "Discharge charge €/m³", v: <NumEdit value={local.dischargeCharge} onSave={(x) => setLocal({ ...local, dischargeCharge: x })} />, q: "measured", src: "waterPrices" },
            ...(["pipeCostPerKm", "polishing", "reclaimedPrice", "onsiteCapex", "recoveryRate"] as const).map((k) => ({
              k: ({ pipeCostPerKm: "Pipe cost €/km", polishing: "Polishing €/m³", reclaimedPrice: "Reclaimed-water price €/m³", onsiteCapex: "On-site capex € per m³/day", recoveryRate: "Recovery rate" })[k],
              v: <RangeEdit value={settings[k]} onSave={(x) => setSettings({ ...settings, [k]: x })} />, q: "assumption" as const, src: "costs" as SourceId,
            })),
            { k: "Scale exponent", v: <NumEdit value={settings.onsiteScaleExponent} onSave={(x) => setSettings({ ...settings, onsiteScaleExponent: Math.min(1, Math.max(0.4, x)) })} />, q: "assumption", src: "costs" },
            { k: "Value lost per m³ cut", v: <NumEdit value={settings.valuePerM3Lost} onSave={(x) => setSettings({ ...settings, valuePerM3Lost: x })} />, q: "assumption", src: "costs" },
            { k: "Drought cut alert / exceptional / emergency", v: <span className="flex gap-1">{(["alert", "exceptional", "emergency"] as const).map((p) => <NumEdit key={p} value={settings.droughtCut[p]} onSave={(x) => setSettings({ ...settings, droughtCut: { ...settings.droughtCut, [p]: Math.min(1, x) } })} />)}</span>, q: "assumption", src: "droughtCases" },
            ...(selected ? [{ k: "Treated flow at the plant", v: `${fmt.format(selected.p.supply.actualFlow)} m³/day`, q: selected.p.supply.actualQuality, src: (selected.p.supply.eeaCode ? "eea" : "wwtp") as SourceId }] : []),
            ...(road.data ? [{ k: "Road route", v: `${fmt1.format(road.data.km)} km`, q: "modelled" as const, src: "route" as SourceId }] : []),
            ...(heightM != null ? [{ k: "Height difference", v: `${heightM >= 0 ? "+" : ""}${fmt.format(heightM)} m`, q: "modelled" as const, src: "meteo" as SourceId }] : []),
            { k: "Drought record", v: droughtRecordLabel(events).split(",")[0], q: "measured", src: "drought" },
          ]}
        />
        <p className="mt-2 text-[11px] text-muted-foreground">Screening estimate, not engineering or investment advice.</p>
      </div>

      {/* Exposure summary, visible without scrolling */}
      <p className="mt-3 text-xs leading-snug">
        <span className="font-medium">Status quo:</span> <Figure value={eurK(col("status")!.expected)} quality="assumption" source="costs" why={lossWhy} /> a year at risk, up to <Figure value={eurK(col("status")!.worst)} quality="assumption" source="costs" why={lossWhy} /> in an emergency.{" "}
        <span className="font-medium">Own plant:</span> <Figure value={eurK(col("own")!.expected)} quality="assumption" source="costs" why={lossWhy} />.{" "}
        {col("connect") && <><span className="font-medium">Connect:</span> <Figure value={eurK(col("connect")!.expected)} quality="assumption" source="costs" why={lossWhy} />.</>}
      </p>

      <Accordion type="multiple" defaultValue={["sources", "community"]} className="mt-1">
        <Section value="need" title="Your water need" note={<>{userQ != null ? "your figure" : "estimate"} <SourceInfo id="demand" /></>}>
          <DemandField value={qDay} isUser={userQ != null} onSave={(x) => setDemandOverride(company.id, x == null ? null : x * 365)} />
          <p className="mt-1 text-xs text-muted-foreground">
            {userQ != null ? "Entered by you." : `Estimate for a typical ${sectorById[company.sector].label.toLowerCase()} site, not measured. Enter your own figure.`}
          </p>
          {company.sendsToPlant && <p className="mt-2 text-xs"><span className="font-medium">Already sends wastewater to a treatment plant</span> <span className="text-muted-foreground">(EU industrial register, 2023; the plant is not named).</span></p>}
        </Section>

        <Section value="sources" title="Where you could source from" note={`within ${SUPPLY_SEARCH_KM} km`}>
          {isLoading ? <Skeleton className="h-24 w-full" /> : candidates.length === 0 ? (
            <p className="text-xs text-muted-foreground">No plant with spare water within {SUPPLY_SEARCH_KM} km.</p>
          ) : (
            <ul className="space-y-1">
              {candidates.map((c) => {
                const on = c.p.id === selected?.p.id;
                const e = evals.get(c.p.id);
                return (
                  <li key={c.p.id}>
                    <div role="button" tabIndex={0} onClick={() => choose(c.p.id)} onKeyDown={(ev) => ev.key === "Enter" && choose(c.p.id)} className={cn("w-full cursor-pointer rounded-md border px-2.5 py-2 text-left text-xs transition-colors", on ? "border-primary bg-primary/5" : "hover:bg-accent")}>
                      <div className="flex justify-between gap-2"><span className="truncate font-medium">{c.p.name}</span>{e?.B && <Figure className="shrink-0" value={`${rng(e.B.perM3)}/m³`} quality="assumption" source="costs" why="Delivered cost: pipe, treatment, reclaimed-water price and pumping; rests on cost benchmarks" />}</div>
                      <div className="tnum mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-muted-foreground">
                        <span>{c.p.municipi}</span>
                        <span>{fmt1.format(c.d)} km straight{on && road.data ? ` · ${fmt1.format(road.data.km)} km road` : ""}</span>
                        <span>{fmt.format(c.p.supply.availableReclaimed)} m³/day spare</span>
                        <span>{c.p.supply.reuseReady ? "Reuse-ready" : "Needs extra treatment"}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-1.5 text-[11px] text-muted-foreground">Ranked by pipe and treatment cost per m³. Prices shown are the full delivered cost, the same as in the answer. Reuse-ready means tertiary treatment with filtration or UV, or a recycling plant in the town.</p>
        </Section>

        {selected && B && (
          <Section value="connection" title="The connection" note={<>estimate <SourceInfo id="route" /></>}>
            <Kv k="Length" v={road.isLoading ? "…" : <>{road.data && <><Figure value={`${fmt1.format(road.data.km)} km`} quality="modelled" source="route" /> by road · </>}{fmt1.format(selected.d)} km straight</>} />
            <Kv k="Height difference" v={elev.isLoading ? "…" : heightM != null ? <Figure value={`${heightM >= 0 ? "+" : ""}${fmt.format(heightM)} m`} quality="modelled" source="meteo" /> : "not available"} />
            <Kv k="Pumping energy" v={<Figure value={`${fmt2.format(B.kwhPerM3)} kWh/m³`} quality={heightM != null ? "modelled" : "assumption"} source="meteo" why="From height difference plus pipe friction and pump efficiency" />} />
            <Kv k="Pipe capex" v={<Figure value={`${eurK(B.capex[0])}-${eurK(B.capex[1])}`} quality="assumption" source="costs" why="Pipe cost per km is a benchmark range" />} />
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
            <p className="mt-2 text-[11px] text-muted-foreground">Road route used as an estimate of the pipe path.</p>
          </Section>
        )}

        {selected && <SpareWater sourcing={selected} demand={qDay} />}

        <Section value="own" title="Your own reuse plant" note={<>estimate <SourceInfo id="costs" /></>}>
          <Kv k="Recovery rate" v={<Figure value={`${fmt.format(settings.recoveryRate[0] * 100)}-${fmt.format(settings.recoveryRate[1] * 100)}%`} quality="assumption" source="costs" />} />
          <Kv k="Capacity" v={<Figure value={`${fmt.format(qDay * settings.recoveryRate[0])}-${fmt.format(qDay * settings.recoveryRate[1])} m³/day`} quality={weakest([demandQ, "assumption"])} source="costs" why="Your demand × recovery rate" />} />
          <Kv k="Capex after scale curve and grants" v={<Figure value={`${eurK(C.capex[0])}-${eurK(C.capex[1])}`} quality="assumption" source="costs" why={`Scale exponent ${settings.onsiteScaleExponent}, grants ${fmt.format(settings.capexGrantShare * 100)}%`} />} />
          <Kv k="Opex" v={<Figure value={`${rng([settings.onsiteOpex[0] * EFFLUENT[effluent].k, settings.onsiteOpex[1] * EFFLUENT[effluent].k])}/m³ recycled`} quality="assumption" source="costs" />} />
          <div className="mt-2">
            <p className="label-caps mb-1">Effluent</p>
            <ToggleGroup type="single" size="sm" variant="outline" value={effluent} onValueChange={(x) => x && setEffluent(x as keyof typeof EFFLUENT)} className="flex-wrap justify-start">
              {(Object.keys(EFFLUENT) as (keyof typeof EFFLUENT)[]).map((k) => <ToggleGroupItem key={k} value={k} className="h-7 px-2 text-[11px]">{EFFLUENT[k].label}</ToggleGroupItem>)}
            </ToggleGroup>
          </div>
        </Section>

        <Section value="drought" title="Drought: now, scenario and history">
          <DroughtNow company={company} events={events} logEnd={drought.data?.latestDataDate} />
          <div className="mt-3">
            <p className="label-caps mb-1">Scenario</p>
            <ToggleGroup type="single" size="sm" variant="outline" value={phase} onValueChange={(x) => x && setPhase(x as Phase)} className="justify-start">
              {SCENARIO_PHASES.map((p) => <ToggleGroupItem key={p} value={p} className="h-7 px-2 text-[11px]">{PHASE_LABEL[p]}</ToggleGroupItem>)}
            </ToggleGroup>
            {(() => {
              const cut = settings.droughtCut[phase];
              const cover = B?.coverage ?? 0;
              return (
                <div className="mt-2">
                  <Kv k="Cut to mains water for industry" v={<Figure value={`${fmt.format(cut * 100)}% · ${fmt.format(qDay * cut)} m³/day`} quality="assumption" source="droughtCases" why="Cut per phase is a setting, based on the 2023-24 Catalan restrictions" />} />
                  <Kv k="Value at risk if it lasted a year" v={<Figure value={eurK(droughtLoss(q, cut, settings.valuePerM3Lost))} quality="assumption" source="costs" why={lossWhy} />} />
                  <Kv k="With your own plant" v={<Figure value={`${eurK(droughtLoss(q, cut, settings.valuePerM3Lost, recovery))} (covers ${fmt.format(recovery * 100)}%)`} quality="assumption" source="costs" why={lossWhy} />} />
                  <Kv k="With the recycled connection" v={B ? <Figure value={`${eurK(droughtLoss(q, cut, settings.valuePerM3Lost, cover))} (covers ${fmt.format(cover * 100)}%)`} quality="assumption" source="costs" why={lossWhy} /> : "no plant in reach"} />
                  <p className="mt-1 text-[11px] text-muted-foreground">Recycled water may also be prioritised for other uses in a drought: El Prat sent most of its reclaimed water back to the Llobregat for drinking-water supply. Whether industrial reuse is exempt from cuts is to confirm with the water authority.</p>
                </div>
              );
            })()}
          </div>
          <DroughtHistory events={events} />
        </Section>

        <Section value="community" title="Community water and risk">
          <Community company={company} qDay={qDay} demandQ={demandQ} choice={choice} setChoice={setChoice}
            shares={{ recovery, coverage: B?.coverage ?? null, sharedCoverage: shared?.coverage ?? null }}
            hasB={!!B} hasShared={!!shared} />
          <RiskMatrix company={company} cols={cols} bill={bill} events={events} qDay={qDay} plantName={selected?.p.name} choice={choice} />
        </Section>
      </Accordion>

      <div className="border-t pt-3">
        <Button asChild className="w-full"><Link to="/analysis" search={{ kind: "company", id: company.id }} resetScroll={false}>Full cost-benefit<ArrowRight /></Link></Button>
        <button className="mt-2 w-full text-center text-[11px] text-muted-foreground underline" onClick={() => select(null)}>Close and return to the map</button>
      </div>
    </div>
  );
}

function DecisionTable({ C, B, shared, payC, payB, recovery, members, joining, setJoin, onHover, best }: {
  C: { perM3: Range; capex: Range }; B: { perM3: Range; capex: Range; coverage: number } | null;
  shared: { perM3: Range; capex: Range; coverage: number; payB: number | null } | null;
  selectedName?: string | undefined; payC: number | null; payB: number | null; recovery: number;
  members: number; joining: number; setJoin: (n: number) => void; onHover: (b: boolean) => void; best?: string | undefined;
}) {
  const pay = (y: number | null) => (y == null ? "not by 2050" : y <= 2026 ? "now" : String(y));
  const F = (x: React.ReactNode, why: string, cls?: string) => <Figure value={x} quality="assumption" source="costs" why={why} {...(cls ? { className: cls } : {})} />;
  const cols = [
    { key: "own", h: "Own plant", cost: C.perM3, capex: C.capex, cover: recovery, pay: payC },
    ...(B ? [{ key: "connect", h: "Connect", cost: B.perM3, capex: B.capex, cover: B.coverage, pay: payB }] : []),
    ...(shared ? [{ key: "shared", h: "Shared pipe", cost: shared.perM3, capex: shared.capex, cover: shared.coverage, pay: shared.payB }] : []),
  ];
  return (
    <div className={cn("mt-3 grid gap-1.5", cols.length === 3 ? "grid-cols-3" : cols.length === 2 ? "grid-cols-2" : "grid-cols-1")}>
      {cols.map((c) => (
        <div key={c.key} className={cn("rounded-md border bg-card p-2 text-xs", best === c.key && "border-flip")} {...(c.key === "shared" ? { onMouseEnter: () => onHover(true), onMouseLeave: () => onHover(false) } : {})}>
          <p className="font-medium">{c.h}</p>
          <p className="mt-1 text-sm font-semibold">{F(`${rng(c.cost)}`, "Cost per m³, rests on cost benchmark ranges")}<span className="text-[10px] font-normal text-muted-foreground"> /m³</span></p>
          <div className="tnum mt-1 space-y-0.5 text-[11px] text-muted-foreground">
            <p>Upfront {F(`${eurK(c.capex[0])}-${eurK(c.capex[1])}`, c.key === "shared" ? "Your share of the shared pipe, after grants" : "After scale curve and grants")}</p>
            <p>Covers {F(`${fmt.format(c.cover * 100)}%`, "Share of your water, and of a drought cut, this option covers")}</p>
            <p>Pays off {F(pay(c.pay), "Mid tariff growth of 3% a year and the drought record")}</p>
          </div>
          {c.key === "shared" && (
            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
              <button type="button" aria-label="Fewer join" className="rounded border p-0.5" onClick={() => setJoin(Math.max(1, joining - 1))}><Minus className="h-3 w-3" /></button>
              <span className="tnum underline decoration-dotted underline-offset-2">{joining} of {members} join</span>
              <button type="button" aria-label="More join" className="rounded border p-0.5" onClick={() => setJoin(Math.min(members, joining + 1))}><Plus className="h-3 w-3" /></button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function RangeBars({ rows, mains }: { rows: { label: string; r: Range }[]; mains: number }) {
  const max = Math.max(mains, ...rows.map((x) => x.r[1])) * 1.1 || 1;
  const pct = (x: number) => `${(x / max) * 100}%`;
  return (
    <div className="mt-3">
      <div className="relative space-y-1.5">
        {rows.map((x) => (
          <div key={x.label} className="flex items-center gap-2 text-[11px]">
            <span className="w-16 shrink-0 text-muted-foreground">{x.label}</span>
            <div className="relative h-3 flex-1">
              <div className="absolute top-0 h-full rounded-sm border-[1.5px] border-dotted border-foreground/60 bg-primary/15" style={{ left: pct(x.r[0]), width: `calc(${pct(x.r[1] - x.r[0])} + 2px)` }} title={`€${fmt2.format(x.r[0])}-${fmt2.format(x.r[1])}/m³`} />
            </div>
          </div>
        ))}
        <div className="pointer-events-none absolute inset-y-0 left-[4.5rem] right-0">
          <div className="absolute inset-y-[-4px] border-l-2 border-flip" style={{ left: pct(mains) }} />
        </div>
      </div>
      <div className="tnum mt-1 flex justify-between pl-[4.5rem] text-[10px] text-muted-foreground">
        <span>€0</span><span className="text-flip">Mains today €{fmt2.format(mains)}</span><span>€{fmt2.format(max)}/m³</span>
      </div>
    </div>
  );
}

function RestsOn({ count, rows }: { count: { a: number; d: number }; rows: { k: string; v: React.ReactNode; q: "measured" | "modelled" | "assumption" | "your figure"; src: SourceId }[] }) {
  return (
    <Collapsible className="mt-3 border-t pt-2">
      <CollapsibleTrigger className="w-full text-left text-xs font-medium underline-offset-2 hover:underline">What this rests on: {count.a} assumptions and {count.d} data sources</CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="mt-2 divide-y">
          {rows.map((r) => (
            <li key={r.k} className="flex items-center justify-between gap-2 py-1.5 text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">{r.k} <SourceInfo id={r.src} quality={r.q === "your figure" ? "measured" : r.q} /></span>
              <span className="flex items-center gap-1.5"><span className="tnum">{r.v}</span><QualityBadge q={r.q} /></span>
            </li>
          ))}
        </ul>
        <p className="mt-1 text-[10px] text-muted-foreground">Edits here update the whole panel, the ranked list and the full cost-benefit.</p>
      </CollapsibleContent>
    </Collapsible>
  );
}

function NumEdit({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [d, setD] = useState(String(value));
  useEffect(() => setD(String(value)), [value]);
  const commit = () => { const n = Number(d); if (Number.isFinite(n) && n >= 0 && n !== value) onSave(n); else setD(String(value)); };
  return <Input type="number" value={d} onChange={(e) => setD(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && commit()} className="tnum h-6 w-16 px-1 text-right text-xs" />;
}
function RangeEdit({ value, onSave }: { value: Range; onSave: (v: Range) => void }) {
  return <span className="flex gap-1"><NumEdit value={value[0]} onSave={(x) => onSave([x, value[1]])} /><NumEdit value={value[1]} onSave={(x) => onSave([value[0], x])} /></span>;
}

function DemandField({ value, isUser, onSave, compact }: { value: number; isUser: boolean; onSave: (v: number | null) => void; compact?: boolean }) {
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState(String(Math.round(value)));
  useEffect(() => setDraft(String(Math.round(value))), [value]);
  if (!edit) return (
    <button onClick={() => setEdit(true)} className="group flex items-baseline gap-1.5 text-left">
      <Figure value={fmt.format(value)} quality={isUser ? "your figure" : "assumption"} source="demand" className={compact ? "text-xs" : "text-2xl font-semibold"} />
      <span className={compact ? "text-xs text-muted-foreground" : "text-sm text-muted-foreground"}>m³/day</span>
      <Pencil className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
    </button>
  );
  return (
    <form className="flex items-center gap-1.5" onSubmit={(e) => { e.preventDefault(); const n = Number(draft); if (Number.isFinite(n) && n > 0) onSave(n); setEdit(false); }}>
      <Input autoFocus type="number" min={1} value={draft} onChange={(e) => setDraft(e.target.value)} className="tnum h-8 w-24" aria-label="Water demand in m³ per day" />
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
  const reuseQ = g || p.national ? "measured" as const : "assumption" as const;
  return (
    <Section value="spare" title="Spare water at the plant">
      <div className="relative flex h-5 w-full overflow-hidden rounded-sm bg-muted">
        {used.map((u, i) => <div key={u.label} title={`${u.label}: ${fmt.format(u.v)} m³/day`} style={{ width: pct(u.v), background: `color-mix(in oklab, var(--muted-foreground) ${70 - i * 10}%, transparent)` }} />)}
        <div title={`Spare: ${fmt.format(spare)} m³/day`} style={{ width: pct(spare), background: "color-mix(in oklab, var(--primary) 35%, transparent)" }} />
        {spare > 0 && <div className="absolute top-0 h-full border-r-2 border-flip" style={{ left: `calc(${pct(used.reduce((a, u) => a + u.v, 0))} + ${Math.min(1, share) * (spare / total) * 100}%)` }} title={`Your demand: ${fmt.format(demand)} m³/day`} />}
      </div>
      <div className="mt-1.5 space-y-0.5">
        <Kv k={<span className="flex items-center gap-1">Treated flow <QualityBadge q={s.actualQuality} /></span>} v={<Figure value={`${fmt.format(s.actualFlow)} m³/day`} quality={s.actualQuality} source={s.eeaCode ? "eea" : "wwtp"} why={s.actualQuality === "measured" ? `EEA treated volume (2022, code ${s.eeaCode})` : p.national ? "Our estimate from population capacity" : "Our estimate from the ACA design flow"} />} />
        <Kv k={<span className="flex items-center gap-1">Already reused <QualityBadge q={reuseQ} /></span>} v={<Figure value={`${fmt.format(s.alreadyReused)} m³/day`} quality={reuseQ} source={g ? "regen" : "eea"} why={g ? `ACA regeneration register, ${g.year}` : p.national ? "EEA reported reuse" : "No regeneration plant in this town, so reuse is assumed to be 0"} />} />
        <Kv k="Spare" v={<Figure value={`${fmt.format(spare)} m³/day`} quality={weakest([s.actualQuality, reuseQ])} source="wwtp" why="Treated flow minus reuse" />} />
      </div>
      <p className="mt-1.5 text-xs">
        {s.suspect ? <span className="text-destructive">Flow data looks wrong ({s.suspect}), so spare volume is set to zero.</span>
          : spare > 0 ? <>You would take <strong className="tnum text-flip">{fmt.format(share * 100)}%</strong> of the spare water. The orange mark is your demand.</> : "No spare water reported."}
      </p>
      {series && series.length > 1 && (
        <>
          <div className="mt-2 h-20">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series.map((y) => ({ year: y.year, total: y.total, industrial: y.byUse.industrial }))}>
                <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11 }} formatter={(x) => `${fmt.format(Number(x))} m³/yr`} />
                <Bar dataKey="total" name="Reused" fill="var(--muted-foreground)" fillOpacity={0.5} />
                <Bar dataKey="industrial" name="Industrial" fill="var(--primary)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">Reused per year, accent = industrial <SourceInfo id="regenHistory" /></p>
        </>
      )}
    </Section>
  );
}

function DroughtNow({ company, events, logEnd }: { company: Company; events: DroughtEvent[] | undefined; logEnd?: string | undefined }) {
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
  const end = logEnd ?? cur?.date;
  const stale = end ? Date.now() - Date.parse(end) > 60 * 864e5 : false;
  return (
    <p className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="text-muted-foreground">{company.municipi}:</span>
      {cur ? <><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: PHASE_COLOR[cur.phase] }} /><span><span className="font-medium">{PHASE_LABEL[cur.phase]}</span> at the last record ({dateLong(end!)}).{stale ? " The ACA log has not been updated since." : ""}</span></> : <span>not available</span>}
      <SourceInfo id="drought" date={end} />
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
        <p className="mb-1 flex items-center gap-1 text-[11px] text-muted-foreground">Drought phase in the town, 2021 to the last record <SourceInfo id="drought" /></p>
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
                <Tooltip contentStyle={{ fontSize: 11 }} formatter={(x) => `${fmt1.format(Number(x))}%`} />
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
                <Tooltip contentStyle={{ fontSize: 11 }} formatter={(x) => `${fmt.format(Number(x))} m³/day`} />
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

// ---- Community water and risk ----

function useCommunity(company: Company) {
  const { region } = useApp();
  const on = region === "cat" || region === "es";
  const prices = useQuery({ queryKey: ["muni-water-price"], queryFn: fetchMuniPrices, enabled: on, staleTime: 864e5, gcTime: 864e5 });
  const water = useQuery({ queryKey: ["comarca-water"], queryFn: fetchComarcaWater, enabled: on, staleTime: 864e5, gcTime: 864e5 });
  const muni = prices.data?.byMuni.get(muniKey(company.municipi));
  const key = muni ? comarcaKey(muni.comarca) : null;
  const series = key ? water.data?.byComarca.get(key) : undefined;
  const latest = series?.at(-1);
  return {
    on, isLoading: prices.isLoading || water.isLoading, isError: prices.isError || water.isError,
    muni, comarca: key ? (water.data?.names.get(key) ?? muni?.comarca) : null, series, latest,
  };
}

function Community({ company, qDay, demandQ, choice, setChoice, shares, hasB, hasShared }: {
  company: Company; qDay: number; demandQ: "your figure" | "assumption"; choice: Choice; setChoice: (c: Choice) => void;
  shares: { recovery: number; coverage: number | null; sharedCoverage: number | null }; hasB: boolean; hasShared: boolean;
}) {
  const c = useCommunity(company);
  const choices: Choice[] = ["status", "own", ...(hasB ? ["connect" as const] : []), ...(hasShared ? ["shared" as const] : [])];
  const share = mainsShare(choice, shares);
  const use = c.latest ? { business: c.latest.business, households: c.latest.households, perCapita: c.latest.perCapita } : null;
  const fp = footprint(qDay, share, use);
  const sliceQ = demandQ === "your figure" ? "measured" : "assumption";
  return (
    <div>
      <p className="label-caps mb-1 flex items-center gap-1">Your share of local water <SourceInfo id="comarcaWater" /></p>
      <ToggleGroup type="single" size="sm" variant="outline" value={choice} onValueChange={(x) => x && setChoice(x as Choice)} className="mb-2 justify-start">
        {choices.map((k) => <ToggleGroupItem key={k} value={k} className="h-7 px-2 text-[11px]">{CHOICE_LABEL[k]}</ToggleGroupItem>)}
      </ToggleGroup>
      {!c.on ? <p className="text-xs text-muted-foreground">Local water use is not loaded for this region.</p>
        : c.isLoading ? <Skeleton className="h-16 w-full" />
        : c.isError ? <p role="alert" className="text-xs text-muted-foreground">Couldn't load comarca water use. Try again later.</p>
        : !c.latest || !use ? <p className="text-xs text-muted-foreground">No comarca water figures found for {company.municipi}.</p>
        : (
          <>
            {(() => {
              const total = use.business + use.households;
              const slice = Math.min(use.business, fp.drawDay * 365);
              return (
                <div>
                  <div className="flex h-5 w-full overflow-hidden rounded-sm border">
                    <div className="h-full" style={{ width: `${(use.households / total) * 100}%`, background: "color-mix(in oklab, var(--muted-foreground) 30%, transparent)" }} title={`Households ${fmt.format(use.households)} m³`} />
                    <div className="relative h-full" style={{ width: `${(use.business / total) * 100}%`, background: "color-mix(in oklab, var(--primary) 25%, transparent)" }} title={`Economic activities ${fmt.format(use.business)} m³`}>
                      <div className={cn("absolute inset-y-0 left-0 min-w-[3px] border-2 border-flip bg-flip/40", sliceQ === "assumption" ? "border-dotted" : "border-solid")} style={{ width: `${(slice / use.business) * 100}%` }} title={`Your mains draw ${fmt.format(fp.drawDay * 365)} m³/yr`} />
                    </div>
                  </div>
                  <div className="tnum mt-0.5 flex justify-between text-[10px] text-muted-foreground"><span>Households {eurless(use.households)}</span><span>Businesses {eurless(use.business)} m³/yr · {c.latest.year}</span></div>
                </div>
              );
            })()}
            <p className="mt-2 text-xs leading-snug">
              <Figure className="font-semibold" value={`${fmtPct(fp.shareOfBusiness ?? 0)}`} quality={weakest([demandQ, "measured"])} source="comarcaWater" why="Your mains draw ÷ the comarca's yearly business network water" /> of the water used by businesses in {c.comarca}, the same as the household use of about{" "}
              <Figure className="font-semibold" value={fmt.format(fp.residents ?? 0)} quality={weakest([demandQ, "measured"])} source="comarcaWater" why={`Litres per day ÷ ${fmt1.format(use.perCapita)} litres per person per day`} /> residents.
            </p>
            {c.series && c.series.length > 1 && (
              <div className="mt-2 h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={c.series.map((y) => ({ year: y.year, Businesses: y.business / 1e6, Households: y.households / 1e6 }))} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                    <YAxis hide />
                    <ReferenceArea x1={2023} x2={2024} fill="var(--warning)" fillOpacity={0.15} label={{ value: "drought", fontSize: 9, position: "insideTop" }} />
                    <Tooltip contentStyle={{ fontSize: 11 }} formatter={(x) => `${fmt1.format(Number(x))} million m³`} />
                    <Line dataKey="Businesses" stroke="var(--primary)" dot={false} strokeWidth={1.5} />
                    <Line dataKey="Households" stroke="var(--muted-foreground)" dot={false} strokeWidth={1.5} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
    </div>
  );
}
const eurless = (m3: number) => `${fmt1.format(m3 / 1e6)}M`;
const fmtPct = (x: number) => `${x < 0.001 ? fmt2.format(x * 100) : fmt1.format(x * 100)}%`;

const CHECKLIST = {
  drought: "Agree a drought allocation with your supplier before the next alert phase.",
  price: "Model your water bill at higher tariffs and lock in reuse volumes early.",
  stress: "Track reservoir fill monthly and prepare a reduced-water operating plan.",
  visibility: "Prepare a public explanation of your water use and savings before a shortage.",
  supplier: "Ask the treatment plant for a firm volume in writing.",
  permit: "Check your discharge permit before building.",
};

function RiskMatrix({ company, cols, bill, events, qDay, plantName, choice }: {
  company: Company; cols: { key: Choice; protect: number; mains: number; expected: number; worst: number; price: number }[];
  bill: number; events: DroughtEvent[] | undefined; qDay: number; plantName?: string | undefined; choice: Choice;
}) {
  const { settings, region } = useApp();
  const c = useCommunity(company);
  const res = useReservoirMonthly();
  const restriction = useRestriction(company);
  const { lowWater } = useStress();
  const t = { high: settings.riskHighShare, medium: settings.riskMediumShare };
  const tWhy = `High above ${fmt1.format(t.high * 100)}% of your yearly water bill, Medium above ${fmt1.format(t.medium * 100)}% (settings)`;
  const lossWhy = `€${fmt.format(settings.valuePerM3Lost)} lost per m³ cut and cuts per phase are settings; frequency from the drought record`;

  // Area source stress: same in every column.
  const stress: { level: Level | null; text: string } = (() => {
    if (region === "fr") {
      const lv = restriction.data?.level;
      const ph = lv ? PHASE_OF[lv] : "normal";
      return { level: ph === "normal" ? "Low" : ph === "pre-alert" || ph === "alert" ? "Medium" : "High", text: `VigiEau: ${lv ? GRAVITE_LABEL[lv] : "no restriction"}` };
    }
    if (region === "de") return lowWater != null ? { level: lowWater > 0.5 ? "High" : lowWater > 0.2 ? "Medium" : "Low", text: `${fmt.format(lowWater * 100)}% of federal gauges at low water` } : { level: null, text: "not loaded" };
    const s = res.data?.series;
    const last = s?.at(-1);
    const med = last ? monthMedian(s!, last.month.slice(5, 7)) : null;
    if (!last || med == null) return { level: null, text: "not loaded for this region" };
    return { level: sourceStressLevel(last.value, med), text: `${fmt1.format(last.value)}% full vs ${fmt1.format(med)}% median for the month` };
  })();

  const severe = !!events?.some((e) => e.phase === "exceptional" || e.phase === "emergency");
  const severeYear = events?.find((e) => e.phase === "emergency" || e.phase === "exceptional");
  const use = c.latest ? { business: c.latest.business, households: c.latest.households, perCapita: c.latest.perCapita } : null;

  const rows = cols.map((col) => {
    const fp = footprint(qDay, col.mains, use);
    return {
      key: col.key,
      drought: riskLevel(col.worst, bill, t),
      price: riskLevel(col.price, bill, t),
      vis: visibilityLevel({ shareOfBusiness: fp.shareOfBusiness, residents: fp.residents, severeInRecord: severe }, { share: settings.visibleShare, residents: settings.visibleResidents }),
      fp, col,
    };
  });
  const picked = rows.find((r) => r.key === choice) ?? rows[0]!;
  const todo = [
    picked.drought !== "Low" && CHECKLIST.drought,
    picked.price !== "Low" && CHECKLIST.price,
    stress.level && stress.level !== "Low" && CHECKLIST.stress,
    picked.vis !== "Low" && CHECKLIST.visibility,
    (choice === "connect" || choice === "shared") && plantName && CHECKLIST.supplier.replace("the treatment plant", plantName),
    choice === "own" && CHECKLIST.permit,
  ].filter(Boolean) as string[];

  const Cell = ({ l, children }: { l: Level | null; children?: React.ReactNode }) => (
    <td className="px-1 py-1.5 align-top">
      {l && <span className={cn("inline-block rounded px-1.5 py-0.5 text-[10px] font-medium", LEVEL_CLS[l])}>{l}</span>}
      {children && <div className="mt-0.5 text-[10px] text-muted-foreground">{children}</div>}
    </td>
  );
  const Head = ({ title, id, why }: { title: string; id: SourceId; why?: string }) => (
    <td className="py-1.5 pr-1 align-top text-[11px]"><span className="flex items-center gap-1 font-medium">{title} <SourceInfo id={id} note={why} /></span></td>
  );

  const download = () => {
    const lines = [
      `Risk checklist: ${company.name} (${company.municipi})`,
      `Option: ${CHOICE_LABEL[choice]}`,
      "Screening estimate from public data and stated assumptions, not engineering or investment advice.",
      "",
      "Risk matrix",
      ...rows.map((r) => `${CHOICE_LABEL[r.key]}: drought ${r.drought} (expected ${eurK(r.col.expected)}/yr, worst ${eurK(r.col.worst)}), price ${r.price} (+${eurK(r.col.price)} in 2035), source stress ${stress.level ?? "n/a"}, visibility ${r.vis}, permits to confirm`),
      "",
      "Prepare",
      ...(todo.length ? todo.map((x) => `- ${x}`) : ["- No risk at Medium or High for this option."]),
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url; a.download = `risk-plan-${company.id}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-4">
      <p className="label-caps mb-1">Risk and liability</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr><th />{rows.map((r) => <th key={r.key} className="px-1 pb-1 text-left text-[11px] font-medium">{CHOICE_LABEL[r.key]}</th>)}</tr></thead>
          <tbody className="tnum">
            <tr className="border-t">
              <Head title="Supply cuts in a drought" id="droughtCases" why={`${droughtRecordLabel(events)}. ${tWhy}.`} />
              {rows.map((r) => <Cell key={r.key} l={r.drought}><Figure value={eurK(r.col.expected)} quality="assumption" source="costs" why={lossWhy} />/yr expected · worst <Figure value={eurK(r.col.worst)} quality="assumption" source="costs" why={lossWhy} /></Cell>)}
            </tr>
            <tr className="border-t">
              <Head title="Price rises" id="waterPrices" why={`Extra yearly cost in 2035 at 3% tariff growth on mains water still bought. ${tWhy}.`} />
              {rows.map((r) => <Cell key={r.key} l={r.price}>+<Figure value={eurK(r.col.price)} quality="assumption" source="waterPrices" why="3% yearly tariff growth is our mid scenario" /> in 2035</Cell>)}
            </tr>
            <tr className="border-t">
              <Head title="Source stress" id={region === "fr" ? "vigieau" : region === "de" ? "pegel" : "reservoirsMonthly"} why={`Venaqua screening rule: ${stress.text}.`} />
              {rows.map((r) => <Cell key={r.key} l={stress.level}>{stress.level ? `exposed: ${fmt.format(r.col.mains * 100)}%` : stress.text}</Cell>)}
            </tr>
            <tr className="border-t">
              <Head title="Local visibility" id="screening" why={`Venaqua screening rule: how visible your water use would be in a shortage. Not a measure of public opinion. High when your draw is at least ${fmt1.format(settings.visibleShare * 100)}% of comarca business water or ${fmt.format(settings.visibleResidents)} resident-equivalents, and the town reached exceptional or emergency in the record.`} />
              {rows.map((r) => <Cell key={r.key} l={use ? r.vis : null}>{use ? `${fmtPct(r.fp.shareOfBusiness ?? 0)} · ${fmt.format(r.fp.residents ?? 0)} residents${severeYear ? ` · ${severeYear.phase} in ${severeYear.date.slice(0, 4)}` : ""}` : "not loaded for this region"}</Cell>)}
            </tr>
            <tr className="border-t">
              <Head title="Permits and water quality" id="screening" why="Reuse permit and quality class depend on the use (RD 1085/2024 in Spain). Confirm with the water authority." />
              {rows.map((r) => <Cell key={r.key} l={null}>to confirm{r.key === "own" ? "; discharge permit may change" : ""}</Cell>)}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">Reuse permit and quality class depend on the use (RD 1085/2024 in Spain). Confirm with the water authority.</p>
      {c.muni && c.muni.series.length > 1 && (
        <div className="mt-2">
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">Water price in {company.municipi}, household tariff, for reference <SourceInfo id="muniWaterPrice" /></p>
          <div className="h-10">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={c.muni.series}><XAxis dataKey="year" hide /><YAxis hide domain={["auto", "auto"]} /><Tooltip contentStyle={{ fontSize: 11 }} formatter={(x) => `€${fmt2.format(Number(x))}/m³`} /><Line dataKey="price" stroke="var(--foreground)" dot={false} strokeWidth={1.25} /></LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      <div className="mt-3 rounded-md border p-2.5">
        <p className="label-caps mb-1">Prepare · {CHOICE_LABEL[choice]}</p>
        {todo.length ? <ul className="list-disc space-y-0.5 pl-4 text-xs">{todo.map((x) => <li key={x}>{x}</li>)}</ul> : <p className="text-xs text-muted-foreground">No risk at Medium or High for this option.</p>}
        <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={download}><Download className="h-3.5 w-3.5" />Download risk plan</Button>
      </div>
    </div>
  );
}

// Keeps unused-style imports referenced for evidence styling helpers.
void qualityStyle;
