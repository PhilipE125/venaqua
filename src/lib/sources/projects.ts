import { muniKey } from "../sectors";
import type { Plant, ReuseProject, SourceResult } from "../types";
import { nominatim } from "./regen";
import { num, socrata } from "./socrata";

export const PROJECTS_ID = "ybgg-dgi6";

export async function fetchProjects(wwtps: Plant[]): Promise<SourceResult<ReuseProject>> {
  const rows = await socrata(PROJECTS_ID, {
    $select:
      "codi_expedient,nom_organ,objecte_contracte,denominacio,valor_estimat_contracte,lloc_execucio,data_publicacio_anunci,data_publicacio_adjudicacio,enllac_publicacio",
    $where:
      "upper(objecte_contracte) like '%AIGUA REGENERADA%' OR upper(objecte_contracte) like '%AGUA REGENERADA%'",
  });
  const byMuni = new Map<string, Plant>();
  for (const p of wwtps) if (!byMuni.has(muniKey(p.municipi))) byMuni.set(muniKey(p.municipi), p);
  const seen = new Set<string>();
  const features: ReuseProject[] = [];
  for (const r of rows) {
    const id = `${r.codi_expedient}-${r.nom_organ}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const place = String(r.lloc_execucio ?? "").split(/[,;]/)[0]!.trim();
    let coords: [number, number] | null = null;
    const hit = byMuni.get(muniKey(place));
    if (hit) coords = [hit.lat - 0.004, hit.lon - 0.004];
    else if (place) coords = await nominatim(place);
    if (!coords) continue;
    features.push({
      id,
      lat: coords[0],
      lon: coords[1],
      buyer: r.nom_organ ?? "",
      object: r.objecte_contracte ?? r.denominacio ?? "",
      value: r.valor_estimat_contracte ? num(r.valor_estimat_contracte) : null,
      date: String(r.data_publicacio_anunci ?? r.data_publicacio_adjudicacio ?? "").slice(0, 10),
      place,
      url: r.enllac_publicacio?.url ?? null,
    });
  }
  return { features, fetchedAt: new Date().toISOString(), fetchedCount: rows.length };
}
