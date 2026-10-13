import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmt, fmt1, useCompanies, useMatches, useRegen, useReservoirs, useTenders, useWwtps } from "@/lib/queries";
import { SECTORS, sectorById, type SectorId } from "@/lib/sectors";
import { SOURCES } from "@/lib/sources/meta";
import { useApp, type LayerKey } from "@/lib/state";
import { LEVEL_COLORS, REGEN_COLOR, fillColor, rgb } from "./map/colors";

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
      {children && <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">{children}</div>}
    </div>
  );
}

function LayersTab() {
  const w = useWwtps();
  const r = useRegen();
  const c = useCompanies();
  const res = useReservoirs();
  const t = useTenders();
  return (
    <div className="px-4">
      <LayerRow k="wwtp" title="Treatment plants" q={w} count={w.data?.features.length}>
        <span className="flex items-center gap-1.5"><Dot color={LEVEL_COLORS.primary} />Primary</span>
        <span className="flex items-center gap-1.5"><Dot color={LEVEL_COLORS.secondary} />Secondary</span>
        <span className="flex items-center gap-1.5"><Dot color={LEVEL_COLORS.tertiary} />Tertiary (N/P removal)</span>
        <span>Size = design capacity</span>
      </LayerRow>
      <LayerRow k="regen" title="Regeneration plants" q={r.isLoading || !r.data ? { ...r, isLoading: !r.isError } : r} count={r.data?.features.length}>
        <span className="flex items-center gap-1.5"><Dot color={REGEN_COLOR} ring />Reuse-ready</span>
      </LayerRow>
      <LayerRow k="companies" title="Companies" q={c} count={c.data?.features.length}>
        {SECTORS.map((s) => (
          <span key={s.id} className="flex items-center gap-1.5"><Dot color={s.color} />{s.label}</span>
        ))}
      </LayerRow>
      <LayerRow k="reservoirs" title="Reservoirs" q={res} count={res.data?.features.length}>
        <span className="flex items-center gap-1.5"><Dot color={fillColor(10)} />&lt;30%</span>
        <span className="flex items-center gap-1.5"><Dot color={fillColor(45)} />30-60%</span>
        <span className="flex items-center gap-1.5"><Dot color={fillColor(80)} />&gt;60%</span>
      </LayerRow>
      <LayerRow k="tenders" title="Tenders" q={t} count={t.data?.tenders.length}>
        <span>Reuse and treatment tenders in Spain (TED)</span>
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
              const s = siteById.get(m.siteId)!;
              const co = companyById.get(m.companyId)!;
              return (
                <li key={m.siteId + m.companyId}>
                  <button
                    onClick={() => select({ kind: s.kind, id: s.id })}
                    className="w-full rounded-sm px-2 py-1.5 text-left transition-colors hover:bg-accent"
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
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

function AboutTab() {
  return (
    <div className="space-y-4 px-4 py-4 text-xs">
      <div className="rounded-sm border bg-muted/50 p-3">
        <p className="label-caps mb-1.5">Opportunity score</p>
        <p className="font-mono text-[11px] leading-relaxed">score = min(supply, demand) × (1 + stress) / (1 + distance_km)</p>
        <ul className="mt-2 space-y-0.5 text-muted-foreground">
          <li>supply: plant design capacity, m³/day (regeneration plants ×2)</li>
          <li>demand: sector estimate, m³/day (editable)</li>
          <li>stress: 1 − average Catalan reservoir fill</li>
          <li>Normalised to 0-100 across all pairs within the distance limit.</li>
        </ul>
      </div>
      <ul className="space-y-3">
        {SOURCES.map((s) => (
          <li key={s.key} className="border-b pb-3">
            <div className="flex items-start justify-between gap-2">
              <a href={s.url} target="_blank" rel="noreferrer" className="font-medium hover:text-primary">{s.name}</a>
              <Badge variant={s.quality === "measured" ? "secondary" : "outline"} className="h-4 shrink-0 px-1.5 text-[10px]">
                {s.quality}
              </Badge>
            </div>
            <p className="mt-1 text-muted-foreground">{s.note}</p>
            <p className="mt-0.5 text-muted-foreground">EU-wide equivalent: {s.euEquivalent}</p>
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground">All sources are fetched live; data is cached for one hour.</p>
    </div>
  );
}

export function Sidebar() {
  const [tab, setTab] = useState("layers");
  return (
    <aside className="panel flex h-full w-[380px] shrink-0 flex-col border-y-0 border-l-0">
      <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-4 mt-3 grid grid-cols-3">
          <TabsTrigger value="layers">Layers</TabsTrigger>
          <TabsTrigger value="opps">Opportunities</TabsTrigger>
          <TabsTrigger value="about">About the data</TabsTrigger>
        </TabsList>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <TabsContent value="layers" className="mt-0"><LayersTab /></TabsContent>
          <TabsContent value="opps" className="mt-0"><OpportunitiesTab /></TabsContent>
          <TabsContent value="about" className="mt-0"><AboutTab /></TabsContent>
        </div>
      </Tabs>
    </aside>
  );
}
