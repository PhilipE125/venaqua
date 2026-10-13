import "maplibre-gl/dist/maplibre-gl.css";
import { setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { MapboxOverlay, type MapboxOverlayProps } from "@deck.gl/mapbox";
import { IconLayer, PathLayer, PolygonLayer, ScatterplotLayer } from "@deck.gl/layers";
import { PathStyleExtension } from "@deck.gl/extensions";
import { useEffect, useMemo, useRef, useState } from "react";
import Map, { NavigationControl, useControl, type MapRef } from "react-map-gl/maplibre";
import { eur, useClusters, useCompanies, useMatches, useProjects, useRegen, useReservoirs, useWwtps } from "@/lib/queries";
import { buyerStatus, KNOWN_USERS } from "@/lib/knownUsers";
import { normalize } from "@/lib/sectors";
import { sectorById } from "@/lib/sectors";
import { useApp } from "@/lib/state";
import type { Company, Plant, RegenPlant, Reservoir, ReuseProject } from "@/lib/types";
import { LEVEL_COLORS, REGEN_COLOR, fillColor } from "./colors";

setWorkerUrl(workerUrl);

function DeckOverlay(props: MapboxOverlayProps) {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
}

type Hover = { x: number; y: number; text: string } | null;

// Owns the hover state so a mouse move re-renders this tooltip only, not the whole map.
function HoverTip({ bind }: { bind: { current: (h: Hover) => void } }) {
  const [hover, setHover] = useState<Hover>(null);
  bind.current = setHover;
  if (!hover) return null;
  return (
    <div
      className="pointer-events-none absolute z-10 rounded-sm bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md"
      style={{ left: hover.x + 12, top: hover.y + 12 }}
    >
      {hover.text}
    </div>
  );
}

// Ring glyph: segments = reuse by use (greys, industry in accent), hollow remainder = unused.
const SEG_COLORS = ["#b5b5b5", "#8f8f8f", "#6b6b6b", "#474747", "#0b6e8a"];
function ringIcon(g: RegenPlant, annual: number): string {
  const vals = [g.reuseByUse.agricultural, g.reuseByUse.environmental, g.reuseByUse.urban, g.reuseByUse.recreational, g.reuseByUse.industrial];
  const total = Math.max(annual, vals.reduce((a, b) => a + b, 0), 1);
  const R = 28, C = 2 * Math.PI * R;
  let off = 0;
  const segs = vals.map((v, i) => {
    const len = (v / total) * C;
    const el = len > 0 ? `<circle r="${R}" cx="32" cy="32" fill="none" stroke="${SEG_COLORS[i]}" stroke-width="7" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" transform="rotate(-90 32 32)"/>` : "";
    off += len;
    return el;
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle r="${R}" cx="32" cy="32" fill="none" stroke="#9a9a9a" stroke-width="1.2" stroke-dasharray="2 2"/>${segs.join("")}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
const SQUARE = `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect x="2" y="2" width="12" height="12" fill="#1a1a1a" stroke="#ffffff" stroke-width="2"/></svg>')}`;
const plantRadius = (d: Plant) => 2.5 + Math.sqrt(d.supply?.actualFlow ?? d.capacity * 0.6) / 16;

export default function MapView() {
  const { layers, selection, select, dark, sector, confirmed, region } = useApp();
  const pr = useProjects();
  const [popup, setPopup] = useState<ReuseProject | null>(null);
  const clusters = useClusters();
  const mapRef = useRef<MapRef>(null);
  const w = useWwtps();
  const r = useRegen();
  const c = useCompanies();
  const res = useReservoirs();
  const { matches, siteById, companyById } = useMatches();
  const setHover = useRef<(h: Hover) => void>(() => {});
  useEffect(() => { mapRef.current?.flyTo({ center: region === "es" ? [-3.7, 40.2] : [1.75, 41.7], zoom: region === "es" ? 5.5 : 7.4, duration: 700 }); }, [region]);

  const selectedSite =
    selection && selection.kind !== "company" ? siteById.get(selection.id) : undefined;
  const arcs = useMemo(() => {
    if (!selectedSite) return [];
    return matches
      .filter((m) => m.siteId === selectedSite.id)
      .filter((m) => sector === "all" || companyById.get(m.companyId)?.sector === sector)
      .map((m) => ({ ...m, company: companyById.get(m.companyId)! }));
  }, [selectedSite, matches, companyById, sector]);
  const arcCompanyIds = useMemo(() => new Set(arcs.map((a) => a.companyId)), [arcs]);

  // Ring glyphs: one per treatment plant that has a regeneration plant in its municipality.
  const rings = useMemo(() => {
    const regens = r.data?.features ?? [];
    const byMuni = new globalThis.Map(regens.map((g) => [normalize(g.municipi), g]));
    const seen = new Set<string>();
    const out: { plant: Plant; g: RegenPlant; icon: string }[] = [];
    for (const p of [...(w.data?.features ?? [])].sort((a, b) => b.capacity - a.capacity)) {
      const g = byMuni.get(normalize(p.municipi));
      if (!g || seen.has(g.id)) continue;
      seen.add(g.id);
      out.push({ plant: p, g, icon: ringIcon(g, (p.supply?.actualFlow ?? 0) * 365) });
    }
    return out;
  }, [w.data, r.data]);

  // Solid links: confirmed users to the plant reported as supplying them.
  const confirmedLinks = useMemo(() => {
    const src = (r.data?.features ?? []).find((g) => normalize(g.name).includes(KNOWN_USERS.plantPattern));
    if (!src) return [];
    return (c.data?.features ?? [])
      .filter((x) => x.confirmedSource || confirmed.has(x.id))
      .map((x) => ({ path: [[src.lon, src.lat], [x.lon, x.lat]] as [number, number][] }));
  }, [r.data, c.data, confirmed]);

  // Stable layer data: a new array makes deck.gl rebuild every attribute for that layer.
  const companyData = useMemo(
    () => (c.data?.features ?? []).filter((d) => sector === "all" || d.sector === sector),
    [c.data, sector],
  );
  const regenData = useMemo(() => {
    const ringed = new Set(rings.map((x) => x.g.id));
    return (r.data?.features ?? []).filter((g) => !ringed.has(g.id));
  }, [r.data, rings]);
  const clusterData = useMemo(() => clusters.slice(0, 40), [clusters]);

  // Fly to whatever is selected, from the map, a list or search.
  useEffect(() => {
    if (!selection || selection.kind === "comarca" || selection.kind === "region") return;
    const f = selection.kind === "company" ? companyById.get(selection.id) : siteById.get(selection.id);
    if (!f) return;
    const m = mapRef.current;
    if (!m) return;
    const z = m.getZoom();
    m.flyTo({ center: [f.lon, f.lat], zoom: Math.max(z, 10), offset: [-180, 0], duration: 900 });
  }, [selection, companyById, siteById]);

  const deckLayers = [
    layers.clusters &&
      new PolygonLayer({
        id: "clusters",
        data: clusterData,
        getPolygon: (d: (typeof clusters)[number]) => d.hull,
        filled: true,
        getFillColor: [11, 110, 138, 25],
        stroked: true,
        getLineColor: [11, 110, 138, 200],
        lineWidthMinPixels: 1.5,
        pickable: true,
      }),
    layers.reservoirs &&
      new ScatterplotLayer<Reservoir>({
        id: "reservoirs",
        data: res.data?.features ?? [],
        getPosition: (d) => [d.lon, d.lat],
        getRadius: 9,
        radiusUnits: "pixels",
        getFillColor: (d) => fillColor(d.fill),
        stroked: true,
        getLineColor: [255, 255, 255],
        lineWidthMinPixels: 2,
        pickable: true,
      }),
    confirmedLinks.length > 0 &&
      new PathLayer({
        id: "confirmed-links",
        data: confirmedLinks,
        getPath: (d: (typeof confirmedLinks)[number]) => d.path,
        getColor: dark ? [240, 240, 240, 200] : [20, 20, 20, 200],
        getWidth: 1.5,
        widthUnits: "pixels",
      }),
    selectedSite &&
      new PathLayer({
        id: "links",
        data: arcs,
        getPath: (d: (typeof arcs)[number]) => [[selectedSite.lon, selectedSite.lat], [d.company.lon, d.company.lat]],
        getColor: [11, 110, 138, 200],
        getWidth: (d: (typeof arcs)[number]) => 0.6 + (d.score / 100) * 4,
        widthUnits: "pixels",
        getDashArray: [4, 3],
        dashJustified: true,
        extensions: [new PathStyleExtension({ dash: true })],
      } as ConstructorParameters<typeof PathLayer>[0]),
    layers.companies &&
      new ScatterplotLayer<Company>({
        id: "companies",
        data: companyData,
        getPosition: (d) => [d.lon, d.lat],
        getRadius: (d) => (arcCompanyIds.has(d.id) || selection?.id === d.id ? 4.5 : 2.8),
        radiusUnits: "pixels",
        stroked: true,
        lineWidthMinPixels: 1,
        getLineColor: (d) => {
          const dim = selectedSite && !arcCompanyIds.has(d.id);
          return [...sectorById[d.sector].color, dim ? 60 : 230] as [number, number, number, number];
        },
        getFillColor: (d) => {
          const st = buyerStatus(d, confirmed);
          const dim = selectedSite && !arcCompanyIds.has(d.id);
          if (st === "confirmed") return (dark ? [240, 240, 240, 255] : [15, 15, 15, 255]) as [number, number, number, number];
          if (st === "water-intensive") return [140, 140, 140, dim ? 50 : 200];
          return [255, 255, 255, dim ? 20 : 90];
        },
        pickable: true,
        updateTriggers: { getRadius: [arcCompanyIds, selection], getFillColor: [arcCompanyIds, selectedSite, confirmed, dark], getLineColor: [arcCompanyIds, selectedSite] },
      }),
    layers.wwtp &&
      new ScatterplotLayer<Plant>({
        id: "wwtp",
        data: w.data?.features ?? [],
        getPosition: (d) => [d.lon, d.lat],
        getRadius: plantRadius,
        radiusUnits: "pixels",
        radiusMaxPixels: 26,
        // Solid fill = measured actual flow (EEA); hollow = assumption.
        getFillColor: (d) => [...LEVEL_COLORS[d.level], d.supply?.actualQuality === "measured" ? (selection?.id === d.id ? 255 : 180) : 40] as [number, number, number, number],
        stroked: true,
        getLineColor: (d) => (selection?.id === d.id ? [0, 0, 0] : d.supply?.actualQuality === "measured" ? [255, 255, 255] : LEVEL_COLORS[d.level]),
        lineWidthMinPixels: 1,
        pickable: true,
        updateTriggers: { getFillColor: [selection], getLineColor: [selection], getRadius: [w.data] },
      }),
    layers.regen &&
      new IconLayer<(typeof rings)[number]>({
        id: "rings",
        data: rings,
        getPosition: (d) => [d.plant.lon, d.plant.lat],
        getIcon: (d) => ({ url: d.icon, id: d.g.id, width: 64, height: 64 }),
        getSize: (d) => Math.min(26, plantRadius(d.plant)) * 2 + 10,
        sizeUnits: "pixels",
        pickable: true,
      }),
    layers.regen &&
      new ScatterplotLayer<RegenPlant>({
        id: "regen",
        data: regenData,
        getPosition: (d) => [d.lon, d.lat],
        getRadius: 6,
        radiusUnits: "pixels",
        getFillColor: [255, 255, 255, 220],
        stroked: true,
        getLineColor: (d) => (selection?.id === d.id ? [0, 0, 0] : REGEN_COLOR),
        lineWidthMinPixels: 3,
        pickable: true,
        updateTriggers: { getLineColor: [selection] },
      }),
    layers.projects &&
      new IconLayer<ReuseProject>({
        id: "projects",
        data: pr.data?.features ?? [],
        getPosition: (d) => [d.lon, d.lat],
        getIcon: () => ({ url: SQUARE, id: "sq", width: 16, height: 16 }),
        getSize: 11,
        sizeUnits: "pixels",
        pickable: true,
      }),
  ].filter(Boolean);

  return (
    <div className="relative h-full w-full">
      <Map
        ref={mapRef}
        initialViewState={{ longitude: region === "es" ? -3.7 : 1.75, latitude: region === "es" ? 40.2 : 41.7, zoom: region === "es" ? 5.5 : 7.4 }}
        mapStyle={
          dark
            ? "https://tiles.openfreemap.org/styles/dark"
            : "https://tiles.openfreemap.org/styles/positron"
        }
        style={{ width: "100%", height: "100%" }}
        attributionControl={{ compact: true }}
      >
        <NavigationControl position="bottom-right" showCompass={false} />
        <DeckOverlay
          interleaved={false}
          layers={deckLayers}
          getCursor={({ isHovering }) => (isHovering ? "pointer" : "grab")}
          onHover={(info) => {
            const raw = info.object as { name?: string; kind?: string; fill?: number; g?: RegenPlant; buyer?: string; object?: string } | undefined;
            const cl = info.object as { companyIds?: string[]; delivered?: number } | undefined;
            const o = cl?.companyIds ? { name: `Shared pipe: ${cl.companyIds.length} companies, ${Math.round(cl.delivered ?? 0)} m³/day` } : raw?.g ? raw.g : raw?.buyer ? { name: `Reuse project: ${raw.buyer}` } : raw;
            if (!o?.name) return setHover.current(null);
            const extra = o.kind === "reservoir" ? ` · ${o.fill}% full` : "";
            setHover.current({ x: info.x, y: info.y, text: o.name + extra });
          }}
          onClick={(info) => {
            const raw = info.object as { id: string; kind: string; g?: RegenPlant; plant?: Plant; buyer?: string } | undefined;
            setPopup(null);
            if (raw?.buyer) return setPopup(raw as unknown as ReuseProject);
            const cc = info.object as { plantId?: string; companyIds?: string[] } | undefined;
            if (cc?.plantId && cc.companyIds) return select({ kind: "wwtp", id: cc.plantId });
            const o = raw?.plant ? raw.plant : raw;
            if (!o) return select(null);
            if (o.kind === "wwtp" || o.kind === "regen" || o.kind === "company")
              select({ kind: o.kind, id: o.id });
          }}
        />
      </Map>
      <div className={`panel map-legend z-10 max-w-[290px] space-y-0.5 rounded-md px-3 py-2 text-[10px] text-muted-foreground ${selection ? "with-selection" : ""}`}>
        {layers.wwtp && <p>Circle = treatment plant; bigger = more water treated; hollow = our estimate.</p>}
        {layers.regen && <p>Ring = recycled water already used (accent = industry); gap = unused.</p>}
        {layers.companies && <p>Dot = company: hollow potential, grey water-intensive, black confirmed.</p>}
        {layers.clusters && <p>Outlined area = companies that could share one pipe.</p>}
        {layers.projects && <p>Black square = reclaimed-water contract.</p>}
        {layers.reservoirs && <p>Red, amber, green = reservoir fill.</p>}
        {selectedSite && <p>Dashed line = possible link from the selected plant.</p>}
      </div>
      {popup && (
        <div className="panel absolute left-3 top-3 z-20 w-80 rounded-md p-3 text-xs shadow-md">
          <div className="flex items-start justify-between gap-2">
            <p className="label-caps">Reuse project</p>
            <button className="text-muted-foreground hover:text-foreground" onClick={() => setPopup(null)} aria-label="Close">×</button>
          </div>
          <p className="mt-1 font-medium">{popup.buyer}</p>
          <p className="mt-1 line-clamp-4 text-muted-foreground">{popup.object}</p>
          <div className="tnum mt-2 flex justify-between"><span>{popup.value != null ? eur.format(popup.value) : "Value n/a"}</span><span>{popup.date}</span></div>
          {popup.url && <a href={popup.url} target="_blank" rel="noreferrer" className="mt-1.5 inline-block underline">Open notice</a>}
        </div>
      )}
      <HoverTip bind={setHover} />
    </div>
  );
}
