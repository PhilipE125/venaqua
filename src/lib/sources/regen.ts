import { normalize } from "../sectors";
import type { Plant, RegenPlant, SourceResult } from "../types";
import { num, socrata, type Row } from "./socrata";
import { titleCase } from "./wwtp";

export const REGEN_ID = "5bep-wiuf";
const CACHE_KEY = "reuse-match:nominatim";

function readCache(): Record<string, [number, number] | null> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export async function nominatim(municipi: string): Promise<[number, number] | null> {
  const cache = readCache();
  if (municipi in cache) return cache[municipi] ?? null;
  await new Promise((r) => setTimeout(r, 1100)); // 1 req/sec
  let result: [number, number] | null = null;
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(municipi + ", Catalonia")}`,
    );
    const j = (await r.json()) as { lat: string; lon: string }[];
    if (j[0]) result = [num(j[0].lat), num(j[0].lon)];
  } catch {
    result = null;
  }
  cache[municipi] = result;
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  return result;
}

export async function fetchRegen(wwtps: Plant[]): Promise<SourceResult<RegenPlant>> {
  const rows = await socrata(REGEN_ID);
  const latest = new Map<string, Row>();
  for (const r of rows) {
    const prev = latest.get(r.era);
    if (!prev || num(r.any) > num(prev.any)) latest.set(r.era, r);
  }
  const byMuni = new Map<string, Plant>();
  for (const p of wwtps) {
    const k = normalize(p.municipi);
    const prev = byMuni.get(k);
    if (!prev || p.capacity > prev.capacity) byMuni.set(k, p);
  }
  const features: RegenPlant[] = [];
  for (const r of latest.values()) {
    const muni = r.municipi ?? "";
    let coords: [number, number] | null = null;
    let geocodedBy: RegenPlant["geocodedBy"] = "wwtp";
    const hit = byMuni.get(normalize(muni));
    if (hit) coords = [hit.lat + 0.002, hit.lon + 0.002];
    else {
      coords = await nominatim(muni);
      geocodedBy = "nominatim";
    }
    if (!coords) continue;
    features.push({
      id: `regen-${normalize(r.era).replace(/\W+/g, "-")}`,
      kind: "regen",
      name: `ERA ${titleCase(r.era)}`,
      lat: coords[0],
      lon: coords[1],
      municipi: muni,
      comarca: r.comarca ?? "",
      operator: r.entitat_gestora_1 ?? "",
      capacity: num(r.cabal_disseny_m3_dia),
      treatments: [r.tractament_1, r.tractament_2, r.tractament_3, r.tractament_4].filter(
        (s) => s && s !== "NA",
      ),
      reusedVolume: num(r.volum_total_aigua_reutilitzada),
      reuseByUse: {
        agricultural: num(r.volum_aigua_reutilitzada),
        environmental: num(r.volum_aigua_reutilitzada_1),
        urban: num(r.volum_aigua_reutilitzada_2),
        recreational: num(r.volum_aigua_reutilitzada_3),
        industrial: num(r.volum_aigua_reutilitzada_4),
      },
      year: r.any ?? "",
      geocodedBy,
    });
  }
  return { features, fetchedAt: new Date().toISOString(), fetchedCount: latest.size, latestDataDate: String(Math.max(...[...latest.values()].map((r) => num(r.any)))) };
}
