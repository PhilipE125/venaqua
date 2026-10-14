// Catalan open data: comarca network water use (2gws-ubmt) and municipal water price (6st4-ptsi).
import { comarcaKey } from "../footprint";
import { muniKey } from "../sectors";
import { num, socrata } from "./socrata";

export const COMARCA_WATER_ID = "2gws-ubmt";
export const MUNI_PRICE_ID = "6st4-ptsi";

export interface ComarcaYear { year: number; business: number; households: number; perCapita: number; population: number }
export interface ComarcaWater { byComarca: Map<string, ComarcaYear[]>; names: Map<string, string>; fetchedAt: string }

export async function fetchComarcaWater(): Promise<ComarcaWater> {
  const rows = await socrata(COMARCA_WATER_ID);
  const byComarca = new Map<string, ComarcaYear[]>();
  const names = new Map<string, string>();
  for (const r of rows) {
    const k = comarcaKey(r.comarca);
    if (!k) continue;
    names.set(k, String(r.comarca).replace(/,\s*\S+$/, "").toLowerCase().replace(/(^|\s)\S/g, (c: string) => c.toUpperCase()));
    const arr = byComarca.get(k) ?? [];
    arr.push({ year: num(r.any), business: num(r.activitats_econ_miques_i), households: num(r.dom_stic_xarxa), perCapita: num(r.consum_dom_stic_per_c_pita), population: num(r.poblaci) });
    byComarca.set(k, arr);
  }
  for (const a of byComarca.values()) a.sort((x, y) => x.year - y.year);
  return { byComarca, names, fetchedAt: new Date().toISOString() };
}

export interface MuniPrice { comarca: string; series: { year: number; price: number }[] }
export interface MuniPrices { byMuni: Map<string, MuniPrice>; fetchedAt: string }

export async function fetchMuniPrices(): Promise<MuniPrices> {
  const rows = await socrata(MUNI_PRICE_ID, { $select: "any,municipi,comarca,preu_aigua" });
  const byMuni = new Map<string, MuniPrice>();
  for (const r of rows) {
    const k = muniKey(r.municipi);
    const e = byMuni.get(k) ?? { comarca: String(r.comarca ?? ""), series: [] };
    e.series.push({ year: num(r.any), price: num(r.preu_aigua) });
    byMuni.set(k, e);
  }
  for (const e of byMuni.values()) e.series.sort((a, b) => a.year - b.year);
  return { byMuni, fetchedAt: new Date().toISOString() };
}
