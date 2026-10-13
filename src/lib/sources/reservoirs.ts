import type { Reservoir, SourceResult } from "../types";
import { num, socrata, type Row } from "./socrata";

export const RESERVOIRS_ID = "gn9e-3qhr";
export const PRAT_ID = "3prd-nrah";

// Approximate dam locations (hard-coded; the dataset has no coordinates).
const COORDS: [string, string, number, number][] = [
  ["Darnius", "Darnius Boadella", 42.3497, 2.8206],
  ["Foix", "Foix", 41.2528, 1.6467],
  ["Baells", "La Baells", 42.1336, 1.8744],
  ["Llosa del Cavall", "La Llosa del Cavall", 42.1197, 1.6014],
  ["Riudecanyes", "Riudecanyes", 41.1347, 0.9617],
  ["Sant Ponç", "Sant Ponç", 41.9653, 1.6017],
  ["Sau", "Sau", 41.9714, 2.3953],
  ["Siurana", "Siurana", 41.2606, 0.9333],
  ["Susqueda", "Susqueda", 41.9803, 2.5239],
];

const isoDaysAgo = (d: number) => new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);

export async function fetchReservoirs(): Promise<SourceResult<Reservoir>> {
  const rows = await socrata(RESERVOIRS_ID, {
    $where: `dia >= '${isoDaysAgo(10)}'`,
    $order: "dia DESC",
  });
  const latest = new Map<string, Row>();
  for (const r of rows) if (!latest.has(r.estaci)) latest.set(r.estaci, r);
  const features: Reservoir[] = [];
  for (const r of latest.values()) {
    const c = COORDS.find(([k]) => r.estaci.includes(k));
    if (!c) continue;
    features.push({
      id: `res-${c[0]}`,
      kind: "reservoir",
      name: c[1],
      lat: c[2],
      lon: c[3],
      fill: num(r.percentatge_volum_embassat),
      volume: num(r.volum_embassat),
      date: r.dia.slice(0, 10),
    });
  }
  return { features, fetchedAt: new Date().toISOString() };
}

export async function fetchReservoirHistory() {
  // Volume-weighted fill: total stored / total capacity (capacity = volume / pct).
  const rows = await socrata<{ dia: string; v: string; cap: string }>(RESERVOIRS_ID, {
    $select: "dia, sum(volum_embassat) as v, sum(volum_embassat * 100 / percentatge_volum_embassat) as cap",
    $where: `dia >= '${isoDaysAgo(90)}' AND percentatge_volum_embassat > 0`,
    $group: "dia",
    $order: "dia",
  });
  return {
    series: rows.map((r) => ({ date: r.dia.slice(0, 10), value: num(r.cap) > 0 ? (num(r.v) / num(r.cap)) * 100 : 0 })),
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchPratHistory() {
  const rows = await socrata<{ dia: string; descripcio_variable: string; cabal_canal_m3_s: string }>(PRAT_ID, {
    $where: `dia >= '${isoDaysAgo(31)}'`,
    $order: "dia",
  });
  // m3/s -> m3/day. Can Solé pumping = reuse; "a riu" = discharged to the river.
  const byDay = new Map<string, { date: string; reuse: number; river: number }>();
  for (const r of rows) {
    const d = r.dia.slice(0, 10);
    const e = byDay.get(d) ?? { date: d, reuse: 0, river: 0 };
    const v = num(r.cabal_canal_m3_s) * 86400;
    if (/a riu/i.test(r.descripcio_variable)) e.river += v;
    else e.reuse += v;
    byDay.set(d, e);
  }
  const series = [...byDay.values()].map((e) => ({ ...e, value: e.reuse }));
  return { series, fetchedAt: new Date().toISOString() };
}
