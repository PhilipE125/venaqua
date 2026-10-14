import { haversineKm } from "./score";
import { normalize, sectorFromIedActivity } from "./sectors";
import type { IedFacility } from "./sources/ied.functions";
import type { Company } from "./types";

const STOP = new Set(["sa", "sl", "slu", "sau", "s", "a", "l", "u", "de", "la", "el", "y", "i", "the", "planta", "fabrica", "centro", "centre"]);
const tokens = (s: string) =>
  new Set(
    normalize(s)
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );

/** Names are similar when they share at least one meaningful token. */
export function similarName(a: string, b: string) {
  const ta = tokens(a);
  for (const t of tokens(b)) if (ta.has(t)) return true;
  return false;
}

export function iedToCompany(f: IedFacility): Company | null {
  const sector = sectorFromIedActivity(f.activity);
  if (!sector) return null;
  return {
    id: `ied-${f.id}`,
    kind: "company",
    name: f.name,
    lat: f.lat,
    lon: f.lon,
    municipi: f.city,
    ccae: `IED ${f.activity}`,
    activity: f.parent && f.parent !== f.name ? `Parent: ${f.parent}` : "",
    sector,
    tipus: "IED installation",
    subtipus: f.activity,
    sources: ["eea"],
    iedActivity: f.activity,
    dischargesToWater: f.water,
    sendsToPlant: f.toPlant,
  };
}

/** Merge EEA facilities into Catalan permits: within 300 m and similar name → one record. */
export function mergeCompanies(aca: Company[], ied: IedFacility[]) {
  const grid = new Map<string, Company[]>();
  const cell = (lat: number, lon: number) => `${Math.floor(lat * 200)}:${Math.floor(lon * 200)}`;
  const out = aca.map((c) => ({ ...c, sources: [...c.sources] }));
  for (const c of out) {
    const k = cell(c.lat, c.lon);
    grid.set(k, [...(grid.get(k) ?? []), c]);
  }
  let merged = 0;
  let excluded = 0;
  for (const f of ied) {
    const co = iedToCompany(f);
    if (!co) {
      excluded++;
      continue;
    }
    let hit: Company | undefined;
    const gy = Math.floor(f.lat * 200);
    const gx = Math.floor(f.lon * 200);
    outer: for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++)
        for (const c of grid.get(`${gy + dy}:${gx + dx}`) ?? [])
          if (haversineKm(c, f) <= 0.3 && (similarName(c.name, f.name) || similarName(c.name, f.parent))) {
            hit = c;
            break outer;
          }
    if (hit) {
      merged++;
      if (!hit.sources.includes("eea")) hit.sources.push("eea");
      hit.iedActivity = f.activity;
      hit.dischargesToWater = hit.dischargesToWater || f.water;
      hit.sendsToPlant = hit.sendsToPlant || f.toPlant;
    } else out.push(co);
  }
  return { companies: out, merged, excluded };
}
