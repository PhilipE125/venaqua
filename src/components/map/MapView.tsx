import "maplibre-gl/dist/maplibre-gl.css";
import { setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { MapboxOverlay, type MapboxOverlayProps } from "@deck.gl/mapbox";
import { ArcLayer, ScatterplotLayer } from "@deck.gl/layers";
import { useMemo, useState } from "react";
import Map, { NavigationControl, useControl } from "react-map-gl/maplibre";
import { useCompanies, useMatches, useRegen, useReservoirs, useWwtps } from "@/lib/queries";
import { sectorById } from "@/lib/sectors";
import { useApp } from "@/lib/state";
import type { Company, Plant, RegenPlant, Reservoir } from "@/lib/types";
import { LEVEL_COLORS, REGEN_COLOR, fillColor } from "./colors";

setWorkerUrl(workerUrl);

function DeckOverlay(props: MapboxOverlayProps) {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
}

type Hover = { x: number; y: number; text: string } | null;

export default function MapView() {
  const { layers, selection, select, dark, sector } = useApp();
  const w = useWwtps();
  const r = useRegen();
  const c = useCompanies();
  const res = useReservoirs();
  const { matches, siteById, companyById } = useMatches();
  const [hover, setHover] = useState<Hover>(null);

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

  const deckLayers = [
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
    layers.companies &&
      new ScatterplotLayer<Company>({
        id: "companies",
        data: (c.data?.features ?? []).filter((d) => sector === "all" || d.sector === sector),
        getPosition: (d) => [d.lon, d.lat],
        getRadius: (d) => (arcCompanyIds.has(d.id) || selection?.id === d.id ? 4.5 : 2.5),
        radiusUnits: "pixels",
        getFillColor: (d) => {
          const col = sectorById[d.sector].color;
          const dim = selectedSite && !arcCompanyIds.has(d.id);
          return [...col, dim ? 60 : 210] as [number, number, number, number];
        },
        pickable: true,
        updateTriggers: { getRadius: [arcCompanyIds, selection], getFillColor: [arcCompanyIds, selectedSite] },
      }),
    layers.wwtp &&
      new ScatterplotLayer<Plant>({
        id: "wwtp",
        data: w.data?.features ?? [],
        getPosition: (d) => [d.lon, d.lat],
        getRadius: (d) => 2.5 + Math.sqrt(d.capacity) / 18,
        radiusUnits: "pixels",
        radiusMaxPixels: 26,
        getFillColor: (d) => [...LEVEL_COLORS[d.level], selection?.id === d.id ? 255 : 170] as [number, number, number, number],
        stroked: true,
        getLineColor: (d) => (selection?.id === d.id ? [0, 0, 0] : [255, 255, 255]),
        lineWidthMinPixels: 1,
        pickable: true,
        updateTriggers: { getFillColor: [selection], getLineColor: [selection] },
      }),
    layers.regen &&
      new ScatterplotLayer<RegenPlant>({
        id: "regen",
        data: r.data?.features ?? [],
        getPosition: (d) => [d.lon, d.lat],
        getRadius: (d) => 7 + Math.sqrt(d.capacity) / 25,
        radiusUnits: "pixels",
        filled: true,
        getFillColor: [255, 255, 255, 220],
        stroked: true,
        getLineColor: (d) => (selection?.id === d.id ? [0, 0, 0] : REGEN_COLOR),
        lineWidthMinPixels: 3,
        pickable: true,
        updateTriggers: { getLineColor: [selection] },
      }),
    selectedSite &&
      new ArcLayer({
        id: "arcs",
        data: arcs,
        getSourcePosition: () => [selectedSite.lon, selectedSite.lat],
        getTargetPosition: (d: (typeof arcs)[number]) => [d.company.lon, d.company.lat],
        getSourceColor: [11, 110, 138, 220],
        getTargetColor: (d: (typeof arcs)[number]) => [...sectorById[d.company.sector].color, 230] as [number, number, number, number],
        getWidth: (d: (typeof arcs)[number]) => 0.5 + (d.score / 100) * 7,
        getHeight: 0.4,
        greatCircle: false,
      }),
  ].filter(Boolean);

  return (
    <div className="relative h-full w-full">
      <Map
        initialViewState={{ longitude: 1.75, latitude: 41.7, zoom: 7.4 }}
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
            const o = info.object as { name?: string; kind?: string; fill?: number } | undefined;
            if (!o?.name) return setHover(null);
            const extra = o.kind === "reservoir" ? ` · ${o.fill}% full` : "";
            setHover({ x: info.x, y: info.y, text: o.name + extra });
          }}
          onClick={(info) => {
            const o = info.object as { id: string; kind: string } | undefined;
            if (!o) return select(null);
            if (o.kind === "wwtp" || o.kind === "regen" || o.kind === "company")
              select({ kind: o.kind, id: o.id });
          }}
        />
      </Map>
      {hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-sm bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md"
          style={{ left: hover.x + 12, top: hover.y + 12 }}
        >
          {hover.text}
        </div>
      )}
    </div>
  );
}
