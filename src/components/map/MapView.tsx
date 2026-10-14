import "maplibre-gl/dist/maplibre-gl.css";
import { setWorkerUrl, type StyleSpecification } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { MapboxOverlay, type MapboxOverlayProps } from "@deck.gl/mapbox";
import { BitmapLayer, IconLayer, PathLayer, PolygonLayer, ScatterplotLayer } from "@deck.gl/layers";
import { PathStyleExtension } from "@deck.gl/extensions";
import { useEffect, useMemo, useRef, useState } from "react";
import Map, { NavigationControl, useControl, type MapRef } from "react-map-gl/maplibre";
import { eur, useClusters, useCompanies, useMatches, useProjects, useRegen, useReservoirs, useWwtps } from "@/lib/queries";
import { buyerStatus, KNOWN_USERS } from "@/lib/knownUsers";
import { normalize } from "@/lib/sectors";
import { sectorById } from "@/lib/sectors";
import { useApp } from "@/lib/state";
import type { Company, Plant, RegenPlant, Reservoir, ReuseProject } from "@/lib/types";
import { LEVEL_COLORS, REGEN_COLOR, fillColor, rgb } from "./colors";
import droughtData from "@/data/drought-comarques.json";
import { predictPipes, type PipeSeg } from "@/lib/pipes";
import { STRESS_BOUNDS, stressImage } from "@/lib/stressGrid";

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
// Opening view per region: whole country first, then sub-areas.
const VIEWS = { es: { longitude: -3.7, latitude: 40.2, zoom: 5.5 }, cat: { longitude: 1.75, latitude: 41.7, zoom: 7.4 }, de: { longitude: 10.4, latitude: 51.2, zoom: 5.6 } } as const;
// Circles shrink when zoomed out to a whole country, so dense urban areas stay readable.
// radiusScale is a GPU uniform: changing it does not rebuild any per-point attributes.
const PIPE_MIN_ZOOM = 9.5;
const zoomScale = (zoom: number) => Math.round(Math.min(1, Math.max(0.35, 2 ** ((zoom - 8) / 2))) * 20) / 20;

// Indicative future water-stress scenario per comarca (not an official forecast).
const HORIZONS = [
  { key: "2y", label: "2 yrs", year: "2028" },
  { key: "5y", label: "5 yrs", year: "2031" },
  { key: "10y", label: "10 yrs", year: "2036" },
  { key: "15y", label: "15 yrs", year: "2041" },
] as const;
const STRESS = (droughtData as unknown as { name: string; risk: Record<string, number>; polygons: [number, number][][] }[]).flatMap((f) =>
  f.polygons.map((polygon) => ({ name: f.name, risk: f.risk, polygon, kind: "stress" })),
);
const RAMP: [number, [number, number, number]][] = [[40, [254, 240, 180]], [60, [253, 174, 97]], [75, [240, 59, 32]], [90, [128, 0, 38]]];
function stressColor(v: number, a: number): [number, number, number, number] {
  for (let i = 1; i < RAMP.length; i++) {
    const hi = RAMP[i]!, lo = RAMP[i - 1]!;
    if (v <= hi[0]) {
      const t = Math.max(0, (v - lo[0]) / (hi[0] - lo[0]));
      return [lo[1][0] + (hi[1][0] - lo[1][0]) * t, lo[1][1] + (hi[1][1] - lo[1][1]) * t, lo[1][2] + (hi[1][2] - lo[1][2]) * t, a];
    }
  }
  const top = RAMP[RAMP.length - 1]![1];
  return [top[0], top[1], top[2], a];
}
const plantRadius = (d: Plant) => 2.5 + Math.sqrt(d.supply?.actualFlow ?? d.capacity * 0.6) / 16;

// Fetch the OpenFreeMap style and re-tint water so rivers and lakes read clearly blue.
function useBasemapStyle(dark: boolean) {
  const [style, setStyle] = useState<StyleSpecification | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(`https://tiles.openfreemap.org/styles/${dark ? "dark" : "positron"}`)
      .then((r) => r.json())
      .then((s) => {
        if (!alive) return;
        for (const l of s.layers ?? []) {
          if (l.id === "water") l.paint = { ...l.paint, "fill-color": dark ? "#1d3f5e" : "#a9d6f2" };
          if (l.id === "waterway") l.paint = { ...l.paint, "line-color": dark ? "#2a5a86" : "#7dbde8" };
        }
        setStyle(s);
      })
      .catch(() => setStyle(null));
    return () => {
      alive = false;
    };
  }, [dark]);
  return style;
}

export default function MapView() {
  const { layers, selection, select, dark, sector, confirmed, region, camera, setCamera, cameraFocus, setCameraFocus } = useApp();
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
  const [scale, setScale] = useState(() => zoomScale((camera ?? VIEWS[region]).zoom));
  const [zoomLvl, setZoomLvl] = useState(() => Math.floor((camera ?? VIEWS[region]).zoom * 2) / 2);
  const basemap = useBasemapStyle(dark);
  // Fly to the region when it changes; on first mount keep a saved camera (e.g. coming back from /analysis).
  const firstRun = useRef(true);
  useEffect(() => {
    const first = firstRun.current;
    firstRun.current = false;
    if (first && camera) return;
    const v = VIEWS[region];
    mapRef.current?.flyTo({ center: [v.longitude, v.latitude], zoom: v.zoom, duration: 700 });
  }, [region]);

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
  const [horizon, setHorizon] = useState<string | null>(null);
  const [showPipes, setShowPipes] = useState(false);
  // Predicted pipes are sketched for Catalonia only to keep the whole-Spain view fast.
  const pipes = useMemo(() => {
    if (!showPipes) return [];
    const inCat = (p: { lon: number; lat: number }) => p.lon > 0.15 && p.lon < 3.35 && p.lat > 40.5 && p.lat < 42.9;
    return predictPipes((w.data?.features ?? []).filter(inCat), (c.data?.features ?? []).filter(inCat));
  }, [showPipes, w.data, c.data]);

  // Fly to whatever is selected, from the map, a list or search.
  useEffect(() => {
    if (!selection || cameraFocus === `${selection.kind}:${selection.id}` || selection.kind === "comarca" || selection.kind === "region") return;
    const f = selection.kind === "company" ? companyById.get(selection.id) : siteById.get(selection.id);
    if (!f) return;
    const m = mapRef.current;
    if (!m) return;
    const z = m.getZoom();
    setCameraFocus(`${selection.kind}:${selection.id}`);
    m.flyTo({ center: [f.lon, f.lat], zoom: Math.max(z, 10), offset: [0, -70], duration: 900 });
  }, [selection, companyById, siteById]);

  const stressYear = HORIZONS.find((h) => h.key === horizon)?.year;
  const stressUrl = useMemo(() => (stressYear && typeof document !== "undefined" ? stressImage(stressYear, (v) => stressColor(v, 255).slice(0, 3).map(Math.round) as [number, number, number]) : null), [stressYear]);
  const pipesVisible = showPipes && zoomLvl >= PIPE_MIN_ZOOM;
  const deckLayers = [
    stressUrl &&
      new BitmapLayer({ id: "future-stress-raster", image: stressUrl, bounds: STRESS_BOUNDS, opacity: 0.62 }),
    stressYear &&
      new PolygonLayer<(typeof STRESS)[number]>({
        id: "future-stress",
        data: STRESS,
        getPolygon: (d) => d.polygon,
        getFillColor: [0, 0, 0, 0],
        getLineColor: (d) => stressColor(d.risk[stressYear] ?? 0, 90),
        lineWidthMinPixels: 0.4,
        stroked: true,
        pickable: true,
        updateTriggers: { getFillColor: [stressYear], getLineColor: [stressYear] },
        transitions: { getFillColor: 500 },
      }),
    pipesVisible &&
      new PathLayer<PipeSeg>({
        id: "pipes-glow",
        data: pipes,
        getPath: (d) => d.path,
        getColor: (d) => (d.rural ? [56, 189, 248, 70] : [11, 110, 138, 30]),
        getWidth: (d) => (d.kind === "trunk" ? 9 : 5) * (d.rural ? 1 : 0.6),
        widthUnits: "pixels",
        jointRounded: true,
        capRounded: true,
      }),
    pipesVisible &&
      new PathLayer<PipeSeg>({
        id: "pipes",
        data: pipes,
        getPath: (d) => d.path,
        getColor: (d) => (d.rural ? [2, 132, 199, 235] : [11, 110, 138, 140]),
        getWidth: (d) => (d.kind === "trunk" ? 3 : 1.4) * (d.rural ? 1 : 0.7),
        widthUnits: "pixels",
        jointRounded: true,
        capRounded: true,
        getDashArray: (d: PipeSeg) => (d.kind === "trunk" ? [0, 0] : [3, 2]),
        dashJustified: true,
        extensions: [new PathStyleExtension({ dash: true })],
      } as ConstructorParameters<typeof PathLayer<PipeSeg>>[0]),
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
        radiusScale: Math.max(0.7, scale),
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
        radiusScale: scale,
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
        sizeScale: scale,
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
        onMoveEnd={e => setCamera(e.viewState)}
        onZoom={e => { setScale(zoomScale(e.viewState.zoom)); setZoomLvl(Math.floor(e.viewState.zoom * 2) / 2); }}
        initialViewState={camera ?? VIEWS[region]}
        mapStyle={
          basemap ??
          (dark
            ? "https://tiles.openfreemap.org/styles/dark"
            : "https://tiles.openfreemap.org/styles/positron")
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
            const st = info.object as { kind?: string; name?: string; risk?: Record<string, number> } | undefined;
            if (st?.kind === "stress" && st.risk && stressYear) return setHover.current({ x: info.x, y: info.y, text: `${st.name} · stress index ${Math.round(st.risk[stressYear] ?? 0)} in ${stressYear}` });
            const raw = info.object as { name?: string; kind?: string; fill?: number; note?: string; g?: RegenPlant; buyer?: string; object?: string } | undefined;
            const cl = info.object as { companyIds?: string[]; delivered?: number } | undefined;
            const o = cl?.companyIds ? { name: `Shared pipe: ${cl.companyIds.length} companies, ${Math.round(cl.delivered ?? 0)} m³/day` } : raw?.g ? raw.g : raw?.buyer ? { name: `Reuse project: ${raw.buyer}` } : raw;
            if (!o?.name) return setHover.current(null);
            const label =
              o.kind === "wwtp" ? "Treatment plant" :
              o.kind === "company" ? "Company" :
              o.kind === "regen" ? "Reuse-ready plant" :
              o.kind === "reservoir" ? "Reservoir" : "";
            const extra = o.kind === "reservoir" ? ` · ${o.note ?? `${o.fill}% full`}` : "";
            setHover.current({ x: info.x, y: info.y, text: `${label ? label + " · " : ""}${o.name}${extra}` });
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
      <div className={`panel map-legend z-10 max-w-[300px] space-y-1 rounded-md px-3 py-2 text-[10px] text-muted-foreground ${selection ? "with-selection" : ""}`}>
        {layers.wwtp && (
          <p className="flex items-center gap-2">
            <span className="flex shrink-0 items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: rgb(LEVEL_COLORS.primary) }} />
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: rgb(LEVEL_COLORS.secondary) }} />
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: rgb(LEVEL_COLORS.tertiary) }} />
            </span>
            Treatment plant — colour = treatment level, size = water treated, hollow = our estimate.
          </p>
        )}
        {layers.regen && (
          <p className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border-2" style={{ borderColor: rgb(REGEN_COLOR) }} />
            Reuse-ready plant — ring = recycled water in use (dark = industry), gap = unused.
          </p>
        )}
        {layers.companies && (
          <p className="flex items-center gap-2">
            <span className="flex shrink-0 items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full border border-muted-foreground/60" />
              <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/70" />
              <span className="inline-block h-2 w-2 rounded-full bg-foreground" />
            </span>
            Company — hollow = potential buyer, grey = water-intensive, solid = confirmed user; border colour = sector.
          </p>
        )}
        {layers.clusters && (
          <p className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm border" style={{ borderColor: "rgba(11,110,138,0.8)", background: "rgba(11,110,138,0.15)" }} />
            Companies that could share one pipe.
          </p>
        )}
        {layers.projects && (
          <p className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 shrink-0 bg-foreground" />
            Signed reclaimed-water contract.
          </p>
        )}
        {layers.reservoirs && (
          <p className="flex items-center gap-2">
            <span className="flex shrink-0 items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: rgb(fillColor(15)) }} />
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: rgb(fillColor(45)) }} />
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: rgb(fillColor(80)) }} />
            </span>
            Water store — low, medium or high fill.
          </p>
        )}
        {selectedSite && (
          <p className="flex items-center gap-2">
            <span className="inline-block h-0 w-5 shrink-0 border-t-2 border-dashed" style={{ borderColor: rgb(LEVEL_COLORS.tertiary) }} />
            Possible link from the selected plant.
          </p>
        )}
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
      <div className="panel future-controls absolute right-3 top-3 z-20 w-60 rounded-xl p-3 text-xs shadow-md">
        <p className="label-caps">Future water stress</p>
        <div className="mt-2 grid grid-cols-5 gap-1">
          <button onClick={() => setHorizon(null)} className={`rounded-md px-1 py-1 ${!horizon ? "bg-foreground text-background" : "bg-muted hover:bg-accent"}`}>Now</button>
          {HORIZONS.map((h) => (
            <button key={h.key} onClick={() => setHorizon(h.key)} className={`rounded-md px-1 py-1 tnum ${horizon === h.key ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"}`}>{h.label}</button>
          ))}
        </div>
        {stressYear && (
          <div className="mt-2">
            <div className="h-2 rounded-full" style={{ background: "linear-gradient(90deg, rgb(254,240,180), rgb(253,174,97), rgb(240,59,32), rgb(128,0,38))" }} />
            <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground"><span>Low</span><span>{stressYear}</span><span>Severe</span></div>
          </div>
        )}
        <label className="mt-3 flex cursor-pointer items-center justify-between gap-2 border-t pt-2">
          <span className="font-medium">Predicted pipe network</span>
          <input type="checkbox" className="accent-[var(--primary)]" checked={showPipes} onChange={(e) => setShowPipes(e.target.checked)} />
        </label>
        {showPipes && !pipesVisible && <p className="mt-1.5 text-[10px] text-muted-foreground">Zoom in closer to see pipe routes.</p>}
        {pipesVisible && (
          <div className="mt-1.5 space-y-1 text-[10px] text-muted-foreground">
            <p className="flex items-center gap-2"><span className="inline-block h-[3px] w-5 rounded" style={{ background: "rgb(2,132,199)" }} />Rural trunk / branch (priority)</p>
            <p className="flex items-center gap-2"><span className="inline-block h-[2px] w-5 rounded" style={{ background: "rgba(11,110,138,0.55)" }} />Urban</p>
          </div>
        )}
        <p className="mt-2 text-[10px] leading-snug text-muted-foreground">Indicative scenario and inferred routes — not an official forecast or as-built map.</p>
      </div>
    </div>
  );
}
