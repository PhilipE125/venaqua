import { Fragment, useState } from "react";
import { Layers3, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LANDSCAPE } from "@/lib/landscape";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmt, fmt1, useCompanies, useDrought, useEea, useMatches, usePrat, useProjects, useRegen, useReservoirHistory, useReservoirs, useTenders, useWwtps } from "@/lib/queries";
import { SECTORS, sectorById, type SectorId } from "@/lib/sectors";
import { META, type SourceId } from "@/lib/sources/contract";
import { QualityBadge } from "./SourceInfo";
import { useApp, type LayerKey } from "@/lib/state";
import { LEVEL_COLORS, REGEN_COLOR, RIVER_COLORS, fillColor, rgb } from "./map/colors";

function Dot({ color, ring }: { color: [number, number, number]; ring?: boolean }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
      style={ring ? { border: `2.5px solid ${rgb(color)}` } : { background: rgb(color) }}
    />
  );
}

function LayerRow({
  k,
  title,
  q,
  count,
  children,
}: {
  k: LayerKey;
  title: string;
  q: { isLoading: boolean; isError: boolean; error: unknown; dataUpdatedAt: number };
  count?: number | undefined;
  children?: React.ReactNode;
}) {
  const { layers, toggleLayer } = useApp();
  return (
    <div className="border-b py-3.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={`l-${k}`} className="text-sm font-medium">
          {title}
        </Label>
        <div className="flex items-center gap-2">
          {q.isLoading ? (
            <Skeleton className="h-3 w-10" />
          ) : count != null ? (
            <span className="tnum text-xs text-muted-foreground">{fmt.format(count)}</span>
          ) : null}
          <Switch id={`l-${k}`} checked={layers[k]} onCheckedChange={() => toggleLayer(k)} />
        </div>
      </div>
      {q.isError && (
        <p className="mt-1.5 text-xs text-destructive">
          Could not load: {q.error instanceof Error ? q.error.message : "error"}
        </p>
      )}
      {q.dataUpdatedAt > 0 && (
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Fetched {new Date(q.dataUpdatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
        </p>
      )}
      {children && layers[k] && <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">{children}</div>}
    </div>
  );
}

function LayersTab() {
  const { region } = useApp();
  const w = useWwtps();
  const r = useRegen();
  const c = useCompanies();
  const res = useReservoirs();
  const t = useTenders();
  const pr = useProjects();
  return (
    <div className="px-4">
      <LayerRow k="wwtp" title="Treatment plants" q={w} count={w.data?.features.length}>
        <span className="flex items-center gap-1.5"><Dot color={LEVEL_COLORS.primary} />Primary</span>
        <span className="flex items-center gap-1.5"><Dot color={LEVEL_COLORS.secondary} />Secondary</span>
        <span className="flex items-center gap-1.5"><Dot color={LEVEL_COLORS.tertiary} />Tertiary (N/P removal)</span>
        <span>Bigger circle = more water treated. Ring = recycled water already used.</span>
      </LayerRow>
      <LayerRow k="regen" title="Water recycling plants" q={r.isLoading || !r.data ? { ...r, isLoading: !r.isError } : r} count={r.data?.features.length}>
        <span className="flex items-center gap-1.5"><Dot color={REGEN_COLOR} ring />Ready to supply recycled water</span>
      </LayerRow>
      <LayerRow k="companies" title="Companies" q={c} count={c.data?.features.length}>
        {SECTORS.map((s) => (
          <span key={s.id} className="flex items-center gap-1.5"><Dot color={s.color} />{s.label}</span>
        ))}
      </LayerRow>
      <LayerRow k="reservoirs" title={region === "de" ? "Rivers (live gauge levels)" : region === "fr" ? "Reservoirs (none in France)" : "Reservoirs"} q={res} count={res.data?.features.length}>
        {region === "de" ? (
          <>
            <span className="flex items-center gap-1.5"><Dot color={RIVER_COLORS.low} />Low water</span>
            <span className="flex items-center gap-1.5"><Dot color={RIVER_COLORS.normal} />Normal</span>
            <span className="flex items-center gap-1.5"><Dot color={RIVER_COLORS.high} />High water</span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1.5"><Dot color={fillColor(10)} />&lt;30%</span>
            <span className="flex items-center gap-1.5"><Dot color={fillColor(45)} />30-60%</span>
            <span className="flex items-center gap-1.5"><Dot color={fillColor(80)} />&gt;60%</span>
          </>
        )}
      </LayerRow>
      <LayerRow k="tenders" title="Tenders" q={t} count={t.data?.tenders.length}>
        <span>Reuse and treatment tenders in Spain (TED)</span>
      </LayerRow>
      <LayerRow k="projects" title="Reuse projects (tenders)" q={pr.isLoading || !pr.data ? { ...pr, isLoading: !pr.isError } : pr} count={pr.data?.features.length}>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 bg-foreground" />Catalan contracts for reclaimed water</span>
      </LayerRow>
      <div className="border-b py-3 text-xs text-muted-foreground">
        <p className="label-caps mb-1.5">Evidence</p>
        <p>Solid = measured · dashed = modelled · dotted or hollow = assumption or potential.</p>
        <p className="mt-1">Companies: hollow = potential, grey = water-intensive, black = confirmed.</p>
      </div>
      <LayerRow k="clusters" title="Shared pipe clusters" q={{ isLoading: false, isError: false, error: null, dataUpdatedAt: 0 }}>
        <span>Groups of 3+ companies that could share one pipe (our estimate)</span>
      </LayerRow>
      <TenderList />
    </div>
  );
}

function TenderList() {
  const { layers } = useApp();
  const t = useTenders();
  if (!layers.tenders || !t.data) return null;
  return (
    <div className="py-3">
      <p className="label-caps mb-2">Latest tenders</p>
      <ul className="space-y-2.5">
        {t.data.tenders.slice(0, 25).map((x) => (
          <li key={x.id} className="text-xs">
            <a href={x.url} target="_blank" rel="noreferrer" className="line-clamp-2 font-medium hover:text-primary">
              {x.title || x.id}
            </a>
            <div className="mt-0.5 flex items-center gap-1.5 text-muted-foreground">
              <Badge variant={x.status === "open" ? "default" : "secondary"} className="h-4 px-1.5 text-[10px]">
                {x.status === "open" ? "Open call" : x.status === "award" ? "Award" : x.type}
              </Badge>
              <span className="tnum">{x.date}</span>
              <span className="truncate">{x.city || x.buyer}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OpportunitiesTab() {
  const { maxKm, setMaxKm, sector, setSector, minCapacity, setMinCapacity, select } = useApp();
  const { filtered, siteById, companyById } = useMatches();
  const c = useCompanies();
  const w = useWwtps();
  const loading = c.isLoading || w.isLoading;
  return (
    <div>
      <div className="space-y-4 border-b px-4 py-4">
        <div className="space-y-1.5">
          <p className="label-caps">Sector</p>
          <Select value={sector} onValueChange={(v) => setSector(v as SectorId | "all")}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sectors</SelectItem>
              {SECTORS.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between"><p className="label-caps">Max distance</p><span className="tnum text-xs">{maxKm} km</span></div>
          <Slider min={1} max={30} step={1} value={[maxKm]} onValueChange={([v]) => setMaxKm(v ?? 10)} />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between"><p className="label-caps">Min plant capacity</p><span className="tnum text-xs">{fmt.format(minCapacity)} m³/day</span></div>
          <Slider min={0} max={50000} step={500} value={[minCapacity]} onValueChange={([v]) => setMinCapacity(v ?? 0)} />
        </div>
      </div>
      <div className="px-4 py-3">
        <p className="label-caps mb-2">Top 50 of {fmt.format(filtered.length)} matches</p>
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}</div>
        ) : (
          <ol className="space-y-1">
            {filtered.slice(0, 50).map((m, i) => {
               const s = siteById.get(m.siteId);
               const co = companyById.get(m.companyId);
               if (!s || !co) return null;
              return (
                <li key={m.siteId + m.companyId}>
                   <Button variant="ghost"
                    onClick={() => select({ kind: s.kind, id: s.id })}
                     className="block h-auto w-full rounded-sm px-2 py-2 text-left whitespace-normal"
                  >
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="truncate font-medium"><span className="tnum mr-1.5 text-muted-foreground">{i + 1}</span>{co.name}</span>
                      <span className="tnum shrink-0">{fmt.format(m.score)}</span>
                    </div>
                    <div className="mt-0.5 flex justify-between gap-2 text-[11px] text-muted-foreground">
                      <span className="truncate">{s.name} · {sectorById[co.sector].label}</span>
                      <span className="tnum shrink-0">{fmt1.format(m.distanceKm)} km</span>
                    </div>
                    <div className="mt-1 h-1 w-full rounded-full bg-muted">
                      <div className="h-1 rounded-full bg-primary" style={{ width: `${m.score}%` }} />
                    </div>
                   </Button>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

function LandscapeBox() {
  return (
    <>
      <div className="rounded-sm border p-3">
        <p className="label-caps mb-1.5">Known gaps in public data</p>
        <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
          {LANDSCAPE.gaps.map((g) => <li key={g}>{g}</li>)}
        </ul>
      </div>
      <div className="rounded-sm border p-3">
        <p className="label-caps mb-1.5">Who else works on this</p>
        <p className="mb-2 text-[11px] text-muted-foreground">{LANDSCAPE.note}</p>
        <table className="w-full">
          <tbody>
            {LANDSCAPE.questions.map((q) => (
              <tr key={q.who} className="border-t align-top">
                <td className="py-1.5 pr-2">{q.who}</td>
                <td className="tnum py-1.5 text-right">{q.players} players</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="label-caps mb-1 mt-3">What they already do</p>
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-0.5">
          {LANDSCAPE.capabilities.map((c) => (
            <Fragment key={c.name}>
              <span>{c.name}</span>
              <span className="tnum text-right">{c.players} of {LANDSCAPE.total}</span>
              <span className="text-right text-muted-foreground">{c.ours}</span>
            </Fragment>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">Fewest players do shared clusters and future stress, so Venaqua adds most there.</p>
      </div>
    </>
  );
}

function DataQualityTab() {
  const w = useWwtps();
  const e = useEea();
  const g = useRegen();
  const c = useCompanies();
  const res = useReservoirHistory();
  const prat = usePrat();
  const dr = useDrought();
  const t = useTenders();
  const pr = useProjects();
  const pct = (a: number, b: number) => (b > 0 ? `${fmt.format((a / b) * 100)}%` : "–");
  const time = (n: number) => (n > 0 ? new Date(n).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "…");
  const rows: { id: SourceId; fetched: number; latest?: string | undefined; coverage?: string | undefined; error?: boolean }[] = [
    { id: "wwtp", fetched: w.dataUpdatedAt, latest: w.data?.latestDataDate, coverage: w.data ? `${fmt.format(w.data.features.length)} / ${fmt.format(w.data.fetchedCount ?? 0)}` : undefined, error: w.isError },
    { id: "eea", fetched: e.dataUpdatedAt, latest: "2022", coverage: e.data ? `${fmt.format(e.data.plants.size)} ES plants` : undefined, error: e.isError },
    { id: "regen", fetched: g.dataUpdatedAt, latest: g.data?.latestDataDate, coverage: g.data ? `${fmt.format(g.data.features.length)} / ${fmt.format(g.data.fetchedCount ?? 0)}` : undefined, error: g.isError },
    { id: "companies", fetched: c.dataUpdatedAt, coverage: c.data ? `${fmt.format((c.data.fetchedCount ?? 0) - (c.data.excludedCount ?? 0))} / ${fmt.format(c.data.fetchedCount ?? 0)}` : undefined, error: c.isError },
    { id: "ied", fetched: c.ied.dataUpdatedAt, latest: "2024", coverage: c.mergeStats ? `${fmt.format(c.mergeStats.iedFetched - c.mergeStats.iedExcluded)} / ${fmt.format(c.mergeStats.iedFetched)}` : undefined, error: c.ied.isError },
    { id: "reservoirs", fetched: res.dataUpdatedAt, latest: res.data?.series.at(-1)?.date, error: res.isError },
    { id: "prat", fetched: prat.dataUpdatedAt, latest: prat.data?.series.at(-1)?.date, error: prat.isError },
    { id: "drought", fetched: dr.dataUpdatedAt, latest: dr.data?.latestDataDate, coverage: dr.data ? `${fmt.format(dr.data.byMuni.size)} municipalities` : undefined, error: dr.isError },
    { id: "ted", fetched: t.dataUpdatedAt, coverage: t.data ? `${fmt.format(t.data.tenders.length)} notices` : undefined, error: t.isError },
    { id: "projects", fetched: pr.dataUpdatedAt, coverage: pr.data ? `${fmt.format(pr.data.features.length)} / ${fmt.format(pr.data.fetchedCount ?? 0)}` : undefined, error: pr.isError },
    { id: "meteo", fetched: 0 },
    { id: "demand", fetched: 0 },
    { id: "costs", fetched: 0 },
  ];
  return (
    <div className="space-y-4 px-4 py-4 text-xs">
      <div className="rounded-sm border bg-muted/50 p-3">
        <p className="label-caps mb-1.5">Join stats</p>
        <div className="grid grid-cols-[1fr_auto] gap-y-1">
          <span className="text-muted-foreground">EEA ↔ Catalan plants matched</span>
          <span className="tnum">{w.join ? `${pct(w.join.matched, w.join.total)} (${fmt.format(w.join.matched)} / ${fmt.format(w.join.total)})` : "…"}</span>
          <span className="text-muted-foreground">Plants flagged as suspect</span>
          <span className="tnum">{w.data ? fmt.format(w.data.features.filter((p) => p.supply?.suspect).length) : "…"}</span>
          <span className="text-muted-foreground">Companies deduplicated (ACA + EEA)</span>
          <span className="tnum">{c.mergeStats ? fmt.format(c.mergeStats.merged) : c.ied.isError ? "EEA unavailable" : "…"}</span>
          <span className="text-muted-foreground">Waste/wastewater facilities excluded</span>
          <span className="tnum">{c.mergeStats ? fmt.format(c.mergeStats.iedExcluded) : "…"}</span>
          <span className="text-muted-foreground">Permit rows excluded</span>
          <span className="tnum">{c.data?.excludedCount != null ? fmt.format(c.data.excludedCount) : "…"}</span>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">Unmatched plants use design flow × 0.6, labelled assumption. Permit exclusions: non-discharge records, water utilities and public bodies.</p>
      </div>
      <table className="w-full">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="pb-1.5 font-normal">Source</th>
            <th className="pb-1.5 text-right font-normal">Coverage</th>
            <th className="pb-1.5 text-right font-normal">Quality</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const m = META[r.id] as (typeof META)[SourceId];
            return (
              <tr key={r.id} className="border-t align-top">
                <td className="py-2 pr-2">
                  <a href={m.url} target="_blank" rel="noreferrer" className="font-medium hover:text-primary">{m.name}</a>
                  <p className="text-[11px] text-muted-foreground">{m.publisher} · {m.updateFrequency}{r.latest ? ` · data ${r.latest}` : ""}{r.fetched ? ` · fetched ${time(r.fetched)}` : ""}</p>
                  {r.error && <p className="text-[11px] text-destructive">Could not load</p>}
                  {"knownIssues" in m && m.knownIssues && <p className="mt-0.5 text-[11px] text-muted-foreground">Known issues: {m.knownIssues.join("; ")}.</p>}
                </td>
                <td className="tnum py-2 text-right text-[11px]">{r.coverage ?? "–"}</td>
                <td className="py-2 text-right"><QualityBadge q={m.quality} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <LandscapeBox />
      <div className="rounded-sm border bg-muted/50 p-3">
        <p className="label-caps mb-1.5">Opportunity score</p>
        <p className="font-mono text-[11px] leading-relaxed">score = min(supply, demand) × (1 + stress) / (1 + distance_km)</p>
        <p className="mt-1 text-muted-foreground">stress = 1 − volume-weighted reservoir fill. Water options use the cost model in settings.</p>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [tab, setTab] = useState("layers");
  const { panelOpen, setPanelOpen, selection } = useApp();
  if (!panelOpen) return null;
  return (
    <aside className={`panel map-left-panel flex flex-col rounded-lg ${selection ? "obscured" : ""}`}>
      <div className="flex items-center justify-between px-4 pt-3"><h2 className="flex items-center gap-2 text-sm font-semibold"><Layers3 className="h-4 w-4 text-primary" />Map controls</h2><Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Close map controls" onClick={() => setPanelOpen(false)}><X /></Button></div>
      <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-4 mt-3 grid grid-cols-3">
          <TabsTrigger value="layers">Layers</TabsTrigger>
          <TabsTrigger value="opps">Filters</TabsTrigger>
          <TabsTrigger value="about">Sources</TabsTrigger>
        </TabsList>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <TabsContent value="layers" className="mt-0"><LayersTab /></TabsContent>
          <TabsContent value="opps" className="mt-0"><OpportunitiesTab /></TabsContent>
          <TabsContent value="about" className="mt-0"><DataQualityTab /></TabsContent>
        </div>
      </Tabs>
    </aside>
  );
}
