import type { Plant, RegenPlant, Supply } from "../types";
import { normalize } from "../sectors";

const BASE =
  "https://water.discomap.eea.europa.eu/arcgis/rest/services/WISE_UWWTD/TreatmentPlants_2022/MapServer/0/query";
const FIELDS =
  "uwwCode,uwwName,uwwNUTS,uwwCapacity,uwwLoadEnteringUWWTP,uwwWasteWaterTreated,uwwWasteWaterReuse,uwwNRemoval,uwwPRemoval,uwwUV,uwwSandFiltration,uwwMicroFiltration,uwwOzonation";

export interface EeaPlant {
  code: string;
  name: string;
  capacity: number;
  treatedM3PerYear: number | null;
  uv: boolean;
  filtration: boolean;
  ozonation: boolean;
  lat?: number;
  lon?: number;
  nuts?: string;
  nRemoval?: boolean;
  pRemoval?: boolean;
  reusePct?: number | null;
}

/** ES09080010001010 → ES9080010001010E (drop the "0" after "ES", append "E"). */
export function eeaJoinKey(codiAglomeracio: string): string | null {
  const c = (codiAglomeracio ?? "").trim().toUpperCase();
  if (!c.startsWith("ES")) return null;
  const rest = c.slice(2);
  return `ES${rest.startsWith("0") ? rest.slice(1) : rest}E`;
}

export async function fetchEeaSpain(): Promise<{ plants: Map<string, EeaPlant>; fetched: number; fetchedAt: string }> {
  const plants = new Map<string, EeaPlant>();
  let offset = 0;
  let fetched = 0;
  for (let i = 0; i < 10; i++) {
    const q = new URLSearchParams({
      where: "rptMStateKey='ES'",
      outFields: FIELDS,
      f: "geojson",
      resultRecordCount: "2000",
      resultOffset: String(offset),
      outSR: "4326",
    });
    const r = await fetch(`${BASE}?${q}`);
    if (!r.ok) throw new Error(`EEA HTTP ${r.status}`);
    const j = (await r.json()) as {
      features: { properties: Record<string, unknown>; geometry?: { coordinates: number[] } }[];
      exceededTransferLimit?: boolean;
      properties?: { exceededTransferLimit?: boolean };
    };
    for (const f of j.features) {
      const p = f.properties;
      const t = p["uwwWasteWaterTreated"];
      plants.set(String(p["uwwCode"]), {
        code: String(p["uwwCode"]),
        name: String(p["uwwName"] ?? ""),
        capacity: Number(p["uwwCapacity"]) || 0,
        treatedM3PerYear: t == null || Number(t) <= 0 ? null : Number(t),
        uv: p["uwwUV"] === 1,
        filtration: p["uwwSandFiltration"] === 1 || p["uwwMicroFiltration"] === 1,
        ozonation: p["uwwOzonation"] === 1,
        lat: f.geometry?.coordinates[1] ?? 0,
        lon: f.geometry?.coordinates[0] ?? 0,
        nuts: String(p["uwwNUTS"] ?? ""),
        nRemoval: p["uwwNRemoval"] === 1,
        pRemoval: p["uwwPRemoval"] === 1,
        reusePct: parseReusePercent(p["uwwWasteWaterReuse"]),
      });
    }
    fetched += j.features.length;
    if (!(j.exceededTransferLimit || j.properties?.exceededTransferLimit)) break;
    offset += 2000;
  }
  return { plants, fetched, fetchedAt: new Date().toISOString() };
}

export function parseReusePercent(value: unknown): number | null {
  if (value == null || String(value).trim() === "") return null;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
}

export function nationalPlant(e: EeaPlant): Plant | null {
  if (!e.lat || !Number.isFinite(e.lon)) return null;
  const treated = e.treatedM3PerYear;
  const flow = treated != null ? treated / 365 : e.capacity * 0.2;
  const reused = flow * ((e.reusePct ?? 0) / 100);
  const tertiary = !!e.nRemoval && !!e.pRemoval;
  const advanced = tertiary && (e.uv || e.filtration || e.ozonation);
  return { id: `eea-${e.code}`, kind: "wwtp", name: e.name, lat: e.lat, lon: e.lon ?? 0, municipi: e.name, comarca: "", operator: "", manager: "", treatment: advanced ? "Advanced treatment" : tertiary ? "Nitrogen and phosphorus removal" : "Secondary treatment", level: tertiary ? "tertiary" : "secondary", capacity: flow, pe: e.capacity, receiving: "", year: "2022", steps: [tertiary ? "N + P removal" : "Secondary", ...(e.filtration ? ["Filtration"] : []), ...(e.uv ? ["UV"] : []), ...(e.ozonation ? ["Ozonation"] : [])], codiAglomeracio: "", nuts: e.nuts ?? "", national: true, reuseReported: e.reusePct ?? null, supply: { designFlow: e.capacity * 0.2, actualFlow: flow, actualQuality: treated != null ? "measured" : "assumption", utilisation: null, alreadyReused: reused, availableReclaimed: Math.max(0, flow - reused), suspect: null, eeaCode: e.code, reuseReady: advanced, eeaFiltration: e.filtration, eeaUV: e.uv } };
}

export const FALLBACK_UTILISATION = 0.6;

/** Pure: compute supply volumes for one plant. */
export function computeSupply(p: Plant, eea: EeaPlant | undefined, regen: RegenPlant | undefined): Supply {
  const designFlow = p.capacity;
  const hasEea = !!eea?.treatedM3PerYear;
  const actualFlow = hasEea ? eea!.treatedM3PerYear! / 365 : designFlow * FALLBACK_UTILISATION;
  const utilisation = designFlow > 0 ? actualFlow / designFlow : null;
  let suspect: string | null = null;
  if (hasEea && p.pe > 0 && actualFlow / p.pe > 1) suspect = "More than 1 m³ per population equivalent per day";
  else if (hasEea && utilisation != null && utilisation > 2) suspect = "Actual flow more than twice the design flow";
  const alreadyReused = regen ? regen.reusedVolume / 365 : 0;
  const eeaFiltration = !!eea?.filtration;
  const eeaUV = !!eea?.uv;
  return {
    designFlow,
    actualFlow,
    actualQuality: hasEea ? "measured" : "assumption",
    utilisation,
    alreadyReused,
    availableReclaimed: suspect ? 0 : Math.max(0, actualFlow - alreadyReused),
    suspect,
    eeaCode: eea?.code ?? null,
    reuseReady: !!regen || (p.level === "tertiary" && (eeaFiltration || eeaUV)),
    eeaFiltration,
    eeaUV,
  };
}

export function enrichPlants(plants: Plant[], eea: Map<string, EeaPlant> | undefined, regens: RegenPlant[]) {
  const regenByMuni = new Map<string, RegenPlant>();
  for (const g of regens) regenByMuni.set(normalize(g.municipi), g);
  let matched = 0;
  const out = plants.map((p) => {
    const key = eeaJoinKey(p.codiAglomeracio);
    const e = key ? eea?.get(key) : undefined;
    if (e?.treatedM3PerYear) matched++;
    return { ...p, supply: computeSupply(p, e, regenByMuni.get(normalize(p.municipi))) };
  });
  return { plants: out, matched, total: plants.length, regenByMuni };
}
