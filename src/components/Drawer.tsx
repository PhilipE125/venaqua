import { ArrowRight, BookmarkPlus, ChevronDown, Download, MessageCircle, X } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectRoute } from "./ProjectRoute";
import { useWorkspace } from "@/lib/workspace";
import type { OpportunitySnapshot } from "@/lib/project-model";
import { META, type SourceId, type SourceMeta } from "@/lib/sources/contract";
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { buyerStatus, STATUS_LABEL } from "@/lib/knownUsers";
import { haversineKm } from "@/lib/score";
import { GRAVITE_LABEL } from "@/lib/sources/vigieau";
import { eurK, fmt, fmt1, fmt2, useClusters, useCompanies, useDrought, useMatches, useMeteo, usePrat, useRegen, useRestriction, useStress, useTenders, useWwtps } from "@/lib/queries";
import { mid } from "@/lib/costs";
import { currentPhase } from "@/lib/sources/drought";
import { muniKey, normalize, sectorById } from "@/lib/sectors";
import type { Quality } from "@/lib/sources/contract";
import { useApp } from "@/lib/state";
import type { BuyerStatus, Company, Plant, RegenPlant, ReuseByUse, SupplySite } from "@/lib/types";
import { Sankey, type Flow } from "./Sankey";
import { QualityBadge, SourceInfo } from "./SourceInfo";
import { WaterOptions } from "./WaterOptions";

function Row({ k, v, info }: { k: string; v: React.ReactNode; info?: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b py-1.5 text-xs">
      <span className="flex items-center gap-1.5 text-muted-foreground">{k}{info}</span>
      <span className="tnum text-right">{v || "–"}</span>
    </div>
  );
}

function Section({ title, children, note }: { title: string; children: React.ReactNode; note?: React.ReactNode }) {
  return (
    <section className="mt-5">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium">{title}</h3>
        {note && <span className="label-caps">{note}</span>}
      </div>
      {children}
    </section>
  );
}

export function Answer({ eyebrow, big, children }: { eyebrow: string; big?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border-b pb-5">
      <p className="label-caps">{eyebrow}</p>
      {big && <p className="tnum mt-1 text-2xl font-medium">{big}</p>}
      <p className="mt-1 text-sm leading-snug">{children}</p>
    </div>
  );
}

export function Details({ children, label = "Show the details" }: { children: React.ReactNode; label?: string }) {
  return (
    <Collapsible className="mt-5 border-t pt-3">
      <CollapsibleTrigger className="group flex w-full items-center justify-between text-xs font-medium">
        {label}
        <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}

function downloadCsv(name: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function StatusChip({ s }: { s: BuyerStatus }) {
  // hollow = potential, grey fill = water-intensive, black fill = confirmed
  const dot = s === "confirmed" ? "bg-foreground" : s === "water-intensive" ? "bg-muted-foreground/60" : "border border-foreground";
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border px-1.5 py-px text-[10px] text-muted-foreground">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${dot}`} />
      {STATUS_LABEL[s]}
    </span>
  );
}

const USES: [keyof ReuseByUse, string][] = [
  ["agricultural", "Agricultural"],
  ["environmental", "Environmental"],
  ["urban", "Urban"],
  ["recreational", "Recreational"],
  ["industrial", "Industrial"],
];

/** Flows for the sankey: actual outflow → reuse by use, remainder to the receiving water. */
function plantFlows(actualM3Yr: number, actualQuality: Quality, regen: RegenPlant | undefined, receiving: string): Flow[] {
  const reused = regen ? regen.reusedVolume : 0;
  const flows: Flow[] = USES.map(([k, label]) => ({ target: label, value: regen?.reuseByUse[k] ?? 0, accent: k === "industrial" }));
  flows.unshift({ target: receiving ? `To ${receiving.toLowerCase().includes("mar") ? "sea" : "river"}` : "River or sea", value: Math.max(0, actualM3Yr - reused), modelled: actualQuality !== "measured" });
  return flows;
}

function ReuseToday({ regen }: { regen: RegenPlant | undefined }) {
  return (
    <Section title="Reuse today" note={regen ? <span className="flex items-center gap-1">{regen.year} <SourceInfo id="regen" date={regen.year} /></span> : undefined}>
      {regen ? (
        <>
          <p className="tnum text-xl font-medium">{fmt.format(regen.reusedVolume)} <span className="text-sm font-normal text-muted-foreground">m³/yr delivered</span></p>
          <div className="mt-1.5">
            {USES.map(([k, label]) => (
              <Row key={k} k={label} v={`${fmt.format(regen.reuseByUse[k])} m³/yr`} />
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">From {regen.name}. Volumes are measured; buyers are not named in the data.</p>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">No public reclaimed water supplied from this plant.</p>
      )}
    </Section>
  );
}

function PratChart() {
  const prat = usePrat();
  if (!prat.data) return <Skeleton className="h-24 w-full" />;
  return (
    <Section title="El Prat daily outflow" note={<span className="flex items-center gap-1">30 days <SourceInfo id="prat" /></span>}>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={prat.data.series} margin={{ top: 2, bottom: 0, left: 0, right: 0 }}>
            <XAxis dataKey="date" hide />
            <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v) => `${fmt.format(Number(v))} m³/day`} />
            <Area type="monotone" dataKey="reuse" name="Reuse (Can Solé)" stackId="1" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.5} />
            <Area type="monotone" dataKey="river" name="To river" stackId="1" stroke="var(--muted-foreground)" fill="var(--muted-foreground)" fillOpacity={0.15} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">Accent = reuse pumped to Can Solé; grey = discharged to the river.</p>
    </Section>
  );
}

function SiteDetail({ site }: { site: SupplySite }) {
  const { matches, companyById } = useMatches();
  const { maxKm, select, confirmed } = useApp();
  const tenders = useTenders();
  const meteo = useMeteo(site.lat, site.lon);
  const regen = useRegen();
  const w = useWwtps();

  // Pair a treatment plant with its regeneration plant (same municipality), and vice versa.
  const regenForSite: RegenPlant | undefined =
    site.kind === "regen" ? site : regen.data?.features.find((g) => normalize(g.municipi) === normalize(site.municipi));
  const plant: Plant | undefined =
    site.kind === "wwtp" ? site : w.data?.features.filter((p) => normalize(p.municipi) === normalize(site.municipi)).sort((a, b) => b.capacity - a.capacity)[0];
  const supply = plant?.supply;

  const buyers = useMemo(
    () =>
      matches
        .filter((m) => m.siteId === site.id)
        .sort((a, b) => b.matched - a.matched || b.score - a.score)
        .map((m) => ({ ...m, company: companyById.get(m.companyId)! })),
    [matches, site.id, companyById],
  );
  const totalDemand = buyers.reduce((s, b) => s + b.matched, 0);
  const canSupply = supply?.availableReclaimed ?? (site.kind === "regen" ? Math.max(0, site.capacity - site.reusedVolume / 365) : 0);
  const siteTenders = (tenders.data?.tenders ?? []).filter((t) => t.city && normalize(t.city) === normalize(site.municipi));

  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="secondary">{site.kind === "regen" ? "Water recycling plant" : "Treatment plant"}</Badge>
        {(site.kind === "regen" || supply?.reuseReady) && <Badge>Reuse-ready</Badge>}
        {site.kind === "wwtp" && <Badge variant="outline" className="capitalize">{site.level}</Badge>}
        {siteTenders.map((t) => (
          <a key={t.id} href={t.url} target="_blank" rel="noreferrer">
            <Badge variant="outline" className="border-primary text-primary">
              {t.status === "open" ? "Active tender" : t.winner ? `Recently awarded to ${t.winner}` : "Recently awarded"}
            </Badge>
          </a>
        ))}
      </div>

      {site.kind === "wwtp" && site.national && <p className="mt-3 border-l-2 border-warning pl-3 text-xs text-muted-foreground">Potential only. {site.reuseReported == null ? "No reuse reported; existing reuse may be missing from public data." : `${fmt1.format(site.reuseReported)}% reuse reported by EEA.`} Firm available supply needs operator confirmation.</p>}
      <div className="mt-3">
        <Answer eyebrow="Answer" big={<>{fmt.format(totalDemand)} <span className="text-sm font-normal text-muted-foreground">m³/day of possible demand</span></>}>
          {buyers.length === 0
            ? `No companies within ${maxKm} km.`
            : `${fmt.format(buyers.length)} potential buyers within ${maxKm} km could use up to ${fmt.format(totalDemand)} m³/day, against about ${fmt.format(canSupply)} m³/day this plant could supply.`}{" "}
          <span className="text-muted-foreground">Demand is our estimate.</span>
        </Answer>
      </div>

      <Section title="Potential buyers" note={`within ${maxKm} km`}>
        <p className="mb-2 text-[11px] text-muted-foreground">
          Companies with a wastewater discharge permit or industrial installation within {maxKm} km. Not confirmed buyers; demand is estimated.
        </p>
        {buyers.length > 0 && (
          <button
            className="mb-2 inline-flex items-center gap-1 text-[11px] underline"
            onClick={() =>
              downloadCsv(`${site.name} potential buyers.csv`, [
                ["Company", "Municipality", "Sector", "Status", "Distance km", "Estimated m3/day", "Score"],
                ...buyers.map((b) => [b.company.name, b.company.municipi, sectorById[b.company.sector].label, buyerStatus(b.company, confirmed), fmt1.format(b.distanceKm), Math.round(b.matched), Math.round(b.score)]),
              ])
            }
          >
            <Download className="h-3 w-3" /> Download all {buyers.length} as CSV
          </button>
        )}
        {buyers.length === 0 ? (
          <p className="text-xs text-muted-foreground">No companies within the distance limit.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="pb-1 font-normal">Company</th>
                <th className="pb-1 text-right font-normal">km</th>
                <th className="pb-1 text-right font-normal">m³/day</th>
              </tr>
            </thead>
            <tbody>
              {buyers.slice(0, 15).map((b) => (
                <tr key={b.companyId} onClick={() => select({ kind: "company", id: b.companyId })} className="cursor-pointer border-t hover:bg-accent">
                  <td className="max-w-[230px] py-1.5 pr-2">
                    <div className="truncate">{b.company.name}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <StatusChip s={buyerStatus(b.company, confirmed)} />
                      {sectorById[b.company.sector].label}
                    </div>
                  </td>
                  <td className="tnum py-1.5 text-right align-top">{fmt1.format(b.distanceKm)}</td>
                  <td className="tnum py-1.5 text-right align-top">{fmt.format(b.matched)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Details>
      {!(site.kind === "wwtp" && site.national) && <ReuseToday regen={regenForSite} />}

      {supply && plant && (
        <Section title="Supply" note="m³/day">
          <Row k={plant.national ? "Capacity-based flow · our estimate" : "Design flow"} info={<SourceInfo id={plant.national ? "eea" : "wwtp"} date={plant.year} />} v={fmt.format(supply.designFlow)} />
          <Row
            k="Actual flow"
            info={<SourceInfo id="eea" quality={supply.actualQuality} note={supply.actualQuality === "assumption" ? plant.national ? "No treated volume: population capacity × 0.2 m³/day." : "No EEA match: design flow × 0.6." : `EEA code ${supply.eeaCode}`} date="2022" />}
            v={<span className="inline-flex items-center gap-1.5"><QualityBadge q={supply.actualQuality} />{fmt.format(supply.actualFlow)}</span>}
          />
          <Row k="How full the plant runs" v={supply.utilisation != null ? `${fmt.format(supply.utilisation * 100)}%` : "–"} />
          <Row k="Already reused" info={<SourceInfo id={plant.national ? "eea" : "regen"} />} v={plant.national && plant.reuseReported == null ? "No reuse reported" : fmt.format(supply.alreadyReused)} />
          <Row k="Available reclaimed" v={<span className="font-medium">{fmt.format(supply.availableReclaimed)}</span>} />
          {supply.suspect && <p className="mt-1.5 text-[11px] text-destructive">Suspect value: {supply.suspect}. Excluded from costs.</p>}
        </Section>
      )}

      {plant && supply && !plant.national && (
        <Section title="Where this plant's water goes" note="m³/yr">
          <Sankey source={plant.name} flows={plantFlows(supply.actualFlow * 365, supply.actualQuality, regenForSite, plant.receiving)} />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Actual outflow (EEA 2022) split into measured reuse by use (ACA); the rest goes to {plant.receiving || "the receiving water"}.
            {supply.actualQuality !== "measured" && " Dashed band is an assumption."}
          </p>
        </Section>
      )}
      {/prat de llobregat/i.test(site.municipi) && <PratChart />}

      <Section title="Plant">
        <Row k="Municipality" v={site.municipi} />
        <Row k="Operator" v={site.operator} />
        <Row k={site.kind === "wwtp" && site.national ? "Treated flow" : "Design capacity"} info={<SourceInfo id={site.kind === "regen" ? "regen" : site.national ? "eea" : "wwtp"} />} v={`${fmt.format(site.capacity)} m³/day`} />
        {site.kind === "wwtp" ? (
          <>
            <Row k="Population equivalent" v={fmt.format(site.pe)} />
            <Row k="Treatment" v={site.treatment} />
            <Row k="Receiving water" v={site.receiving} />
            <Row k="Data year" v={site.year} />
          </>
        ) : (
          <>
            <Row k="Data year" v={site.year} />
            <Row k="Location" v={site.geocodedBy === "wwtp" ? "From WWTP in municipality" : "Municipality centroid"} />
          </>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Steps: {(site.kind === "wwtp" ? site.steps : site.treatments).join(" → ") || "–"}
        </p>
      </Section>

      <Section title="Local water demand pressure" note={<span className="flex items-center gap-1">modelled <SourceInfo id="meteo" /></span>}>
        {meteo.isLoading ? (
          <Skeleton className="h-28 w-full" />
        ) : meteo.isError || !meteo.data ? (
          <p className="text-xs text-destructive">Open-Meteo unavailable.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div><p className="label-caps">ET0 30d</p><p className="tnum text-base">{fmt.format(meteo.data.et0)} mm</p></div>
              <div><p className="label-caps">Rain 30d</p><p className="tnum text-base">{fmt.format(meteo.data.rain)} mm</p></div>
              <div><p className="label-caps">Deficit</p><p className="tnum text-base">{fmt.format(meteo.data.deficit)} mm</p></div>
            </div>
            <div className="mt-2 h-20">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={meteo.data.days} barGap={0}>
                  <XAxis dataKey="date" hide />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="et0" name="ET0 mm" fill="var(--chart-3)" />
                  <Bar dataKey="rain" name="Rain mm" fill="var(--chart-1)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </Section>
      </Details>
    </>
  );
}

function CompanyDetail({ company, view = "overview", onSummary }: { company: Company; view?: "overview" | "economics"; onSummary?: (p: OpportunitySnapshot) => void }) {
  const { settings, select, confirmed, toggleConfirmed, demandOverride, mode } = useApp();
  const w = useWwtps();
  const status = buyerStatus(company, confirmed);
  const nearest = useMemo(
    () =>
      (w.data?.features ?? [])
        .filter((p) => p.supply?.reuseReady)
        .map((p) => ({ p, d: haversineKm(company, p) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 3),
    [w.data, company],
  );
  const demand = demandOverride[company.id] != null ? demandOverride[company.id]! / 365 : settings.sectorDemand[company.sector];
  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{sectorById[company.sector].label}</Badge>
        <StatusChip s={status} />
        {company.sources.map((s) => (
          <Badge key={s} variant="outline" className="h-5 px-1.5 text-[10px] font-normal">{s === "aca" ? "ACA permit" : "EEA IED"}</Badge>
        ))}
      </div>
      {company.confirmedSource && <p className="mt-2 text-[11px] text-muted-foreground">Confirmed user. Source: {company.confirmedSource}.</p>}
      <button className="mt-2 text-[11px] text-muted-foreground underline" onClick={() => toggleConfirmed(company.id)}>
        {confirmed.has(company.id) ? "Remove my confirmation" : "I know this company uses reclaimed water"}
      </button>

      <WaterOptions company={company} focus={mode} view={view} onSummary={onSummary} />

      <Details label="About this company">
      <Section title="Company">
        <Row k="Municipality" v={company.municipi} />
        <Row k="Activity" info={<SourceInfo id={company.sources.includes("aca") ? "companies" : "ied"} />} v={<span className="line-clamp-2 max-w-[220px]">{company.ccae}</span>} />
        <Row k="Type" v={`${company.tipus}${company.subtipus ? ` · ${company.subtipus}` : ""}`} />
        {company.dischargesToWater != null && <Row k="Releases to water (E-PRTR)" info={<SourceInfo id="ied" />} v={company.dischargesToWater ? "Yes" : "No report"} />}
        {company.activity && <p className="mt-2 text-xs text-muted-foreground first-letter:uppercase">{company.activity}</p>}
      </Section>
      <Section title="Water demand" note={<span className="flex items-center gap-1">{demandOverride[company.id] != null ? "your figure" : "estimate"} <SourceInfo id="demand" /></span>}>
        <p className="tnum text-2xl">{fmt.format(demand)} <span className="text-sm text-muted-foreground">m³/day</span></p>
        <p className="mt-1 text-xs text-muted-foreground">
          {demandOverride[company.id] != null ? "Entered by you." : "Sector placeholder, not measured. Enter your own figure under Inputs."}
        </p>
      </Section>
      <Section title="Nearest reuse-ready plants">
        {w.isLoading ? <Skeleton className="h-20 w-full" /> : (
          <ul className="space-y-1">
            {nearest.map(({ p, d }) => (
              <li key={p.id}>
                <button onClick={() => select({ kind: "wwtp", id: p.id })} className="flex w-full justify-between rounded-sm px-2 py-1.5 text-left text-xs hover:bg-accent">
                  <span>{p.name}<span className="ml-1.5 text-muted-foreground">{fmt.format(p.supply?.availableReclaimed ?? 0)} m³/day available</span></span>
                  <span className="tnum">{fmt1.format(d)} km</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>
      </Details>
    </>
  );
}

function ComarcaDetail({ comarca }: { comarca: string }) {
  const { select } = useApp();
  const w = useWwtps();
  const regen = useRegen();
  const c = useCompanies();
  const { fill } = useStress();
  const comarques = useMemo(() => [...new Set((w.data?.features ?? []).map((p) => p.comarca).filter(Boolean))].sort(), [w.data]);
  const agg = useMemo(() => {
    const plants = (w.data?.features ?? []).filter((p) => p.comarca === comarca);
    const regens = (regen.data?.features ?? []).filter((g) => g.comarca === comarca);
    const actual = plants.reduce((s, p) => s + (p.supply?.actualFlow ?? 0) * 365, 0);
    const assumed = plants.some((p) => p.supply?.actualQuality !== "measured");
    const byUse = USES.map(([k, label]) => ({ target: label, value: regens.reduce((s, g) => s + g.reuseByUse[k], 0), accent: k === "industrial" }));
    const reused = byUse.reduce((s, f) => s + f.value, 0);
    const munis = new Set(plants.map((p) => normalize(p.municipi)));
    const companies = (c.data?.features ?? []).filter((x) => munis.has(normalize(x.municipi))).length;
    return { plants: plants.length, regens: regens.length, actual, reused, flows: [{ target: "River or sea", value: Math.max(0, actual - reused), modelled: assumed }, ...byUse] as Flow[], companies };
  }, [w.data, regen.data, c.data, comarca]);
  return (
    <>
      <Select value={comarca} onValueChange={(v) => select({ kind: "comarca", id: v })}>
        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>{comarques.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
      </Select>
      <Section title="Where the comarca's water goes" note="m³/yr">
        {w.isLoading ? <Skeleton className="h-40 w-full" /> : <Sankey source={comarca} flows={agg.flows} />}
      </Section>
      <Section title="Summary">
        <Row k="Treatment plants" v={fmt.format(agg.plants)} />
        <Row k="Water recycling plants" info={<SourceInfo id="regen" />} v={fmt.format(agg.regens)} />
        <Row k="Treated outflow" info={<SourceInfo id="eea" />} v={`${fmt1.format(agg.actual / 1e6)} Mm³/yr`} />
        <Row k="Reused" v={`${agg.actual > 0 ? fmt.format((agg.reused / agg.actual) * 100) : 0}%`} />
        <Row k="Companies in plant municipalities" v={fmt.format(agg.companies)} />
        <Row k="Reservoir fill, Catalonia" info={<SourceInfo id="reservoirs" />} v={fill != null ? `${fmt1.format(fill)}%` : "–"} />
      </Section>
    </>
  );
}

const PHASE_WEIGHT: Record<string, number> = { normal: 0, "pre-alert": 0.25, alert: 0.5, exceptional: 0.75, emergency: 1 };

function RegionDetail() {
  const { select, maxKm, settings } = useApp();
  const { matches, siteById, companyById } = useMatches();
  const drought = useDrought();
  const { stress, fill } = useStress();
  const clusters = useClusters();
  const w = useWwtps();
  const links = useMemo(() => {
    // Pressure relief = water moved off the mains, weighted by local drought phase and reservoir stress.
    return matches
      .map((m) => {
        const co = companyById.get(m.companyId)!;
        const ph = currentPhase(drought.data?.byMuni.get(muniKey(co.municipi)))?.phase ?? "normal";
        const severity = PHASE_WEIGHT[ph] ?? 0;
        return { ...m, co, ph, relief: m.matched * (1 + severity + stress) };
      })
      .sort((a, b) => b.relief - a.relief)
      .slice(0, 10);
  }, [matches, companyById, drought.data, stress]);
  const comarques = useMemo(() => [...new Set((w.data?.features ?? []).map((p) => p.comarca).filter(Boolean))].sort(), [w.data]);
  return (
    <>
      <Answer
        eyebrow="Answer"
        big={clusters[0] ? <>{fmt2.format(clusters[0].costPerM3[0])}–{fmt2.format(clusters[0].costPerM3[1])} <span className="text-sm font-normal text-muted-foreground">€/m³ pipe cost, best shared link</span></> : undefined}
      >
        {clusters.length
          ? `${clusters.length} groups of companies could share one pipe from a plant within ${maxKm} km. The best one serves ${clusters[0]!.companyIds.length} companies near ${siteById.get(clusters[0]!.plantId)?.name ?? "a plant"}.`
          : "Looking for groups of companies that could share one pipe…"}
        <span className="text-muted-foreground"> Reservoirs are {fill != null ? `${fmt1.format(fill)}% full` : "loading"}.</span>
      </Answer>

      <Section title="Shared pipe clusters" note={<span className="flex items-center gap-1">our estimate <SourceInfo id="costs" /></span>}>
        <p className="mb-2 text-[11px] text-muted-foreground">Three or more companies in the same direction from one plant, sharing a trunk pipe with short branches. Outlined on the map.</p>
        <table className="w-full text-xs">
          <thead><tr className="text-left text-muted-foreground"><th className="pb-1 font-normal">Plant</th><th className="pb-1 text-right font-normal">Firms</th><th className="pb-1 text-right font-normal">m³/day</th><th className="pb-1 text-right font-normal">€/m³</th></tr></thead>
          <tbody>
            {clusters.slice(0, 10).map((c) => (
              <tr key={c.plantId + c.companyIds[0]} className="cursor-pointer border-t hover:bg-accent" onClick={() => select({ kind: "wwtp", id: c.plantId })}>
                <td className="max-w-[170px] truncate py-1.5 pr-2">{siteById.get(c.plantId)?.name}</td>
                <td className="tnum text-right">{c.companyIds.length}</td>
                <td className="tnum text-right">{fmt.format(c.delivered)}</td>
                <td className="tnum text-right">{fmt2.format(mid(c.costPerM3))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-1.5 text-[11px] text-muted-foreground">Pipe cost only, {eurK(settings.pipeCostPerKm[0])}–{eurK(settings.pipeCostPerKm[1])} per km, over {settings.years} years.</p>
      </Section>

      <Section title="Links that relieve the most stressed sources" note="top 10">
        <p className="mb-2 text-[11px] text-muted-foreground">Water moved off the mains, weighted up where the municipality is in a drought phase and reservoirs are low.</p>
        <ol className="space-y-1 text-xs">
          {links.map((l, i) => (
            <li key={l.siteId + l.companyId}>
              <button className="flex w-full justify-between gap-2 rounded-sm px-1.5 py-1 text-left hover:bg-accent" onClick={() => select({ kind: "company", id: l.companyId })}>
                <span className="truncate"><span className="tnum mr-1.5 text-muted-foreground">{i + 1}</span>{l.co.name} ← {siteById.get(l.siteId)?.name}</span>
                <span className="tnum shrink-0 text-muted-foreground">{fmt.format(l.matched)} m³/d{l.ph !== "normal" ? ` · ${l.ph}` : ""}</span>
              </button>
            </li>
          ))}
        </ol>
      </Section>

      <Details label="Look at one comarca">
        <div className="mt-3">
          <Select onValueChange={(v) => select({ kind: "comarca", id: v })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Choose a comarca" /></SelectTrigger>
            <SelectContent>{comarques.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </Details>
    </>
  );
}

export function AnalysisWorkspace() {
  const { selection, select, maxKm } = useApp();
  const { siteById, companyById, matches } = useMatches();
  const { save, setContact } = useWorkspace();
  const [tab, setTab] = useState("overview");
  const [summary, setSummary] = useState<OpportunitySnapshot | null>(null);
  const [saving, setSaving] = useState(false);
  if (!selection) return null;
  let name: string | undefined;
  let body: React.ReactNode = null;
  if (selection.kind === "region") {
    name = "Catalonia: where reuse helps most";
    body = <RegionDetail />;
  } else if (selection.kind === "comarca") {
    name = `Comarca: ${selection.id}`;
    body = <ComarcaDetail comarca={selection.id} />;
  } else if (selection.kind === "company") {
    const company = companyById.get(selection.id);
    name = company?.name;
    if (company) body = <CompanyDetail key={company.id} company={company} onSummary={setSummary} />;
  } else {
    const site = siteById.get(selection.id);
    name = site?.name;
    if (site) body = <SiteDetail key={site.id} site={site} />;
  }
  if (!name) return null;
  const site = siteById.get(selection.id);
  const company = companyById.get(selection.id);
  const location = site?.municipi ?? company?.municipi ?? "Catalonia";
  const links = matches.filter(m => m.siteId === selection.id);
  const volume = site ? (site.kind === "wwtp" ? site.supply?.availableReclaimed ?? 0 : Math.max(0, site.capacity - site.reusedVolume / 365)) : 0;
  const base: OpportunitySnapshot = { id: selection.id, kind: selection.kind, name, location, plant: site?.name ?? "", buyer: "", volume, distance: null, cost: "Select a buyer to evaluate costs", value: "Needs a confirmed buyer", confidence: "Estimated demand · supply needs confirmation", verdict: volume > 0 ? `Potential supply: ${fmt.format(volume)} m³/day and ${links.length} potential buyers within ${maxKm} km.` : "Needs validation: confirm supply and demand before evaluating a project.", blocker: "Firm available supply, buyer demand and pipe route are not confirmed.", nextAction: "Confirm firm supply with the plant operator, then validate the nearest buyer's demand." };
  const snapshot = summary?.id === selection.id ? summary : base;
  const sourceIds: SourceId[] = company ? [...(company.sources.includes("aca") ? ["companies" as const] : []), ...(company.sources.includes("eea") ? ["ied" as const] : []), "demand", "costs", "meteo"] : ["wwtp", "eea", "regen", "costs"];
  async function shortlist() { setSaving(true); try { if (await save(snapshot)) { toast.success("Saved to Projects"); setTab("route"); } } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save project"); } finally { setSaving(false); } }
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col px-4 pb-12 sm:px-8" aria-label="Opportunity analysis">
      <div className="flex items-start justify-between gap-2 px-6 pt-5 pb-3">
        <div><p className="mb-2 text-[11px] text-muted-foreground">Evaluate a project</p><h2 className="text-lg font-semibold leading-snug">{name}</h2><p className="mt-1 text-xs text-muted-foreground">{location}</p></div>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" asChild aria-label="Back to map">
          <Link to="/" resetScroll={false}><X className="h-4 w-4" /></Link>
        </Button>
      </div>
      <div className="sticky top-16 z-20 bg-background px-6 py-4"><div className="mb-3 flex flex-wrap gap-2"><Badge variant="outline" className="border-warning/40 text-warning">Needs validation</Badge><Badge variant="secondary">{company ? "Estimated demand" : site?.kind === "wwtp" && site.supply?.actualQuality === "measured" ? "Measured flow" : "Our estimate"}</Badge></div><div className="flex gap-2"><Button className="flex-1" size="sm" disabled={saving} onClick={shortlist}><BookmarkPlus />{saving ? "Saving…" : "Save project"}<ArrowRight /></Button><Button size="sm" variant="outline" aria-label="Contact team" onClick={() => setContact(name ?? "")}><MessageCircle />Contact team</Button></div></div>
      <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col"><TabsList className="mx-6 grid shrink-0 grid-cols-4"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="economics">Economics</TabsTrigger><TabsTrigger value="route">Project route</TabsTrigger><TabsTrigger value="evidence">Evidence</TabsTrigger></TabsList><div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <TabsContent value="overview" className="mt-0">{body}{site && <div className="mt-5 border-l-2 border-primary pl-3"><p className="label-caps">Recommended next step</p><p className="mt-1 text-sm">{base.nextAction}</p></div>}</TabsContent>
        <TabsContent value="economics" className="mt-0">{company ? <CompanyDetail company={company} view="economics" onSummary={setSummary} /> : <><h3 className="text-xl font-semibold">Start with a buyer.</h3><p className="mt-3 text-sm text-muted-foreground">Connection economics depend on each buyer's demand, tariff, water quality and route. Select a potential buyer from the overview to compare mains water, a connection and on-site reuse.</p><Button className="mt-5" variant="outline" onClick={() => setTab("overview")}>View potential buyers<ArrowRight /></Button></>}</TabsContent>
        <TabsContent value="route" className="mt-0"><ProjectRoute onContact={() => setContact(`Engineer-reviewed Deal File: ${name}`)} /></TabsContent>
        <TabsContent value="evidence" className="mt-0"><h3 className="text-xl font-semibold">What supports this opportunity?</h3><p className="my-3 text-sm text-muted-foreground">Public records are evidence of infrastructure, not confirmed spare capacity or buyer commitment.</p>{sourceIds.map(id => <div key={id} className="border-b py-4"><div className="flex items-center justify-between gap-3"><a className="text-sm font-medium hover:text-primary" href={META[id].url} target="_blank" rel="noreferrer">{META[id].name}</a><QualityBadge q={META[id].quality} /></div><p className="mt-1 text-xs text-muted-foreground">{META[id].publisher} · {id === "eea" ? "2022 records" : id === "ied" ? "2024 records" : site?.year ? `${site.year} records` : META[id].updateFrequency}</p><p className="mt-2 text-xs text-muted-foreground">{(META[id] as SourceMeta).knownIssues?.join(". ")}</p></div>)}<p className="mt-4 text-xs text-warning">Needs user confirmation: demand, tariff, water-quality requirements and commercial commitment.</p></TabsContent>
      </div></Tabs>
      <div className="shrink-0 border-t px-6 py-3"><Button variant="link" size="sm" className="h-auto p-0" onClick={() => setContact(name ?? "")}><MessageCircle />Validate this opportunity with us</Button></div>
    </section>
  );
}


// France: the drought restriction in force at this site (VigiEau, business profile).
function RestrictionBadge({ at }: { at: { lat: number; lon: number } }) {
  const r = useRestriction(at);
  if (r.isLoading) return <p className="mt-1 text-xs text-muted-foreground">Drought restriction: loading…</p>;
  if (r.isError || !r.data) return <p className="mt-1 text-xs text-muted-foreground">Drought restriction: unavailable</p>;
  const { level, zone } = r.data;
  return (
    <p className="mt-1 text-xs">
      <span className="text-muted-foreground">Drought restriction (VigiEau): </span>
      <span className={level === "crise" || level === "alerte_renforcee" ? "font-medium text-destructive" : "font-medium"}>{level ? GRAVITE_LABEL[level] : "None in force"}</span>
      {zone && <span className="text-muted-foreground"> · {zone}</span>}
    </p>
  );
}

export function Drawer() {
  const { selection, select, settings, demandOverride, maxKm, region } = useApp();
  const { siteById, companyById, matches } = useMatches();
  if (!selection) return null;
  const company = selection.kind === "company" ? companyById.get(selection.id) : undefined;
  const site = selection.kind === "wwtp" || selection.kind === "regen" ? siteById.get(selection.id) : undefined;
  const name = company?.name ?? site?.name ?? (selection.kind === "region" ? "Catalonia reuse opportunities" : selection.kind === "comarca" ? `Comarca: ${selection.id}` : null);
  if (!name) return null;
  const demand = company ? (demandOverride[company.id] ?? settings.sectorDemand[company.sector] * 365) / 365 : 0;
  const supply = site ? (site.kind === "wwtp" ? site.supply?.availableReclaimed ?? 0 : Math.max(0, site.capacity - site.reusedVolume / 365)) : 0;
  const count = matches.filter(m => company ? m.companyId === company.id : m.siteId === site?.id).length;
  return <aside className="compact-preview rounded-lg border bg-card p-5 shadow-map-panel" aria-label="Opportunity preview">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="label-caps">{company ? "Company" : site ? "Water treatment plant" : "Regional opportunity"}</p><h2 className="mt-1 text-base font-semibold break-words">{name}</h2><p className="mt-1 text-xs text-muted-foreground">{company?.municipi ?? site?.municipi ?? "Catalonia"}</p>{region === "fr" && (company ?? site) && <RestrictionBadge at={(company ?? site)!} />}</div><Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => select(null)} aria-label="Close preview"><X /></Button></div>
    <p className="mt-3 text-sm">{company || site ? count ? `${count} potential ${company ? "suppliers" : "buyers"} within ${maxKm} km. Validate supply and demand before investing.` : "Needs validation: no ranked link within the current filters." : "Compare potential links and shared-pipe opportunities."}</p>
    {(company || site) && <p className="tnum mt-3 text-xl font-semibold">{fmt.format(company ? demand : supply)} <span className="text-xs font-normal text-muted-foreground">m³/day · {company ? "indicative demand" : "potential supply"}</span></p>}
    <p className="mt-2 text-xs text-muted-foreground">{site?.kind === "wwtp" && site.supply?.actualQuality === "measured" ? "Measured flow · spare supply needs confirmation" : company && demandOverride[company.id] != null ? "Your demand figure · needs confirmation" : "Estimated · needs confirmation"}</p>
    <Button asChild className="mt-4 w-full"><Link to="/analysis" search={{ kind: selection.kind, id: selection.id }} resetScroll={false}>Open analysis<ArrowRight /></Link></Button>
  </aside>;
}
