import type { Reservoir, SourceResult } from "../types";

// River flow points for Catalonia (ACA daily flow) and France (OFB ONDE field observations).
// Both are normalised to the gauge shape used by PEGELONLINE (fill 15/55/90 = low/normal/high)
// so the same river colours, legend and hover apply in every country.
const FILL = { low: 15, normal: 55, high: 90 } as const;
type State = keyof typeof FILL;

const isoDaysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);

/** ETRS89 / UTM zone 31N (EPSG:25831) to WGS84 lon/lat. Standard Transverse Mercator inverse. */
export function utm31ToLonLat(x: number, y: number): [number, number] {
  const a = 6378137, f = 1 / 298.257222101, k0 = 0.9996;
  const e2 = f * (2 - f), ep2 = e2 / (1 - e2);
  const m = y / k0;
  const mu = m / (a * (1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 ** 3) / 256));
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const p = mu + ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) + ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) + ((151 * e1 ** 3) / 96) * Math.sin(6 * mu);
  const s = Math.sin(p), c = Math.cos(p), t = Math.tan(p);
  const n = a / Math.sqrt(1 - e2 * s * s);
  const r = (a * (1 - e2)) / (1 - e2 * s * s) ** 1.5;
  const C = ep2 * c * c, T = t * t;
  const D = (x - 500000) / (n * k0);
  const lat = p - ((n * t) / r) * (D * D / 2 - ((5 + 3 * T + 10 * C - 4 * C * C - 9 * ep2) * D ** 4) / 24 + ((61 + 90 * T + 298 * C + 45 * T * T - 252 * ep2 - 3 * C * C) * D ** 6) / 720);
  const lon = (D - ((1 + 2 * T + C) * D ** 3) / 6 + ((5 - 2 * C + 28 * T - 3 * C * C + 8 * ep2 + 24 * T * T) * D ** 5) / 120) / c;
  return [3 + (lon * 180) / Math.PI, (lat * 180) / Math.PI];
}

/** Today's flow against the station's own recent median: below half = low, above double = high. */
export function flowState(latest: number, median: number): State {
  if (!(median > 0)) return latest > 0 ? "normal" : "low";
  const r = latest / median;
  return r < 0.5 ? "low" : r > 2 ? "high" : "normal";
}

const median = (v: number[]) => {
  const s = [...v].sort((a, b) => a - b);
  const h = s.length >> 1;
  return s.length % 2 ? (s[h] ?? 0) : ((s[h - 1] ?? 0) + (s[h] ?? 0)) / 2;
};

interface AcaRow { dia: string; codi_estacio: string; estacio: string; subconca?: string; utm_x: string; utm_y: string; codi_variable: string; descripcio_variable: string; valor: string }

export async function fetchCatRivers(): Promise<SourceResult<Reservoir>> {
  const where = encodeURIComponent(`tipus_variable='Cabal riu' AND dia >= '${isoDaysAgo(60)}'`);
  const r = await fetch(`https://analisi.transparenciacatalunya.cat/resource/hprm-xuw7.json?$where=${where}&$limit=50000&$select=dia,codi_estacio,estacio,subconca,utm_x,utm_y,codi_variable,descripcio_variable,valor`);
  if (!r.ok) throw new Error(`ACA river flow HTTP ${r.status}`);
  const rows = (await r.json()) as AcaRow[];
  // One series per station: the main river flow, not maintenance outlets or channels.
  const series = new Map<string, AcaRow[]>();
  for (const row of rows) {
    if (/desgu|canal|sequi|derivaci/i.test(row.descripcio_variable)) continue;
    const list = series.get(row.codi_variable) ?? [];
    list.push(row);
    series.set(row.codi_variable, list);
  }
  const best = new Map<string, AcaRow[]>();
  for (const list of series.values()) {
    const first = list[0];
    if (!first) continue;
    const prev = best.get(first.codi_estacio);
    if (!prev || list.length > prev.length) best.set(first.codi_estacio, list);
  }
  const features: Reservoir[] = [];
  for (const list of best.values()) {
    list.sort((a, b) => a.dia.localeCompare(b.dia));
    const vals = list.map((x) => Number(x.valor)).filter(Number.isFinite);
    const last = list[list.length - 1];
    if (!last) continue;
    const x = Number(last.utm_x), y = Number(last.utm_y);
    if (vals.length < 7 || !x || !y) continue;
    const latest = Number(last.valor), med = median(vals);
    const state = flowState(latest, med);
    const [lon, lat] = utm31ToLonLat(x, y);
    const pct = med > 0 ? Math.round((latest / med) * 100) : null;
    features.push({
      id: `river-cat-${last.codi_estacio}`,
      kind: "reservoir",
      name: `${last.estacio.replace(/^Aforament\s*-\s*/i, "").replace(/^Qualitat\s*-\s*/i, "")}${last.subconca ? ` (${last.subconca})` : ""}`,
      lat, lon,
      fill: FILL[state],
      volume: 0,
      date: last.dia.slice(0, 10),
      note: `${state === "low" ? "low flow" : state === "high" ? "high flow" : "normal flow"} · ${latest.toFixed(2)} m³/s${pct != null ? `, ${pct}% of 60-day median` : ""}`,
    });
  }
  return { features, fetchedAt: new Date().toISOString() };
}

interface OndeObs { code_station: string; libelle_station: string; libelle_cours_eau?: string; latitude?: number; longitude?: number; date_observation: string; code_ecoulement: string }

// ONDE codes: 1/1a visible flow, 1f weak visible flow, 2 no visible flow, 3 dry.
const ONDE: Record<string, { state: State; label: string }> = {
  "1": { state: "normal", label: "flowing" },
  "1a": { state: "normal", label: "flowing" },
  "1f": { state: "low", label: "weak flow" },
  "2": { state: "low", label: "no visible flow" },
  "3": { state: "low", label: "dry" },
};

export async function fetchFrRivers(): Promise<SourceResult<Reservoir>> {
  const r = await fetch(`https://hubeau.eaufrance.fr/api/v1/ecoulement/observations?size=20000&date_observation_min=${isoDaysAgo(75)}&fields=code_station,libelle_station,libelle_cours_eau,latitude,longitude,date_observation,code_ecoulement`);
  if (!r.ok && r.status !== 206) throw new Error(`Hub'Eau ONDE HTTP ${r.status}`);
  const { data } = (await r.json()) as { data: OndeObs[] };
  const latest = new Map<string, OndeObs>();
  for (const o of data) {
    const p = latest.get(o.code_station);
    if (!p || o.date_observation > p.date_observation) latest.set(o.code_station, o);
  }
  const features: Reservoir[] = [];
  for (const o of latest.values()) {
    const s = ONDE[o.code_ecoulement];
    if (!s || o.latitude == null || o.longitude == null) continue;
    features.push({
      id: `river-fr-${o.code_station}`,
      kind: "reservoir",
      name: `${o.libelle_station}`,
      lat: o.latitude, lon: o.longitude,
      fill: FILL[s.state],
      volume: 0,
      date: o.date_observation.slice(0, 10),
      note: `${s.label} (field check ${o.date_observation.slice(0, 10)})`,
    });
  }
  return { features, fetchedAt: new Date().toISOString() };
}
