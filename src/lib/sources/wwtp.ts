import type { Plant, SourceResult, TreatmentLevel } from "../types";
import { num, socrata, type Row } from "./socrata";

export const WWTP_ID = "k288-dig3";

function level(r: Row): TreatmentLevel {
  const t = (r.tipus_tractament ?? "").toLowerCase();
  const tert = r.tipus_tractament_terciari && r.tipus_tractament_terciari !== "NA";
  if (tert || t.includes("terciari") || t.includes("nitrogen") || t.includes("fòsfor") || t.includes("fosfor")) return "tertiary";
  // Lagoons and extensive systems are biological (secondary) treatment.
  if (t.includes("biol") || t.includes("llacun") || t.includes("lagun") || t.includes("extensiu") || t.includes("aiguamoll")) return "secondary";
  return "primary";
}

export async function fetchWwtps(): Promise<SourceResult<Plant>> {
  const rows = await socrata(WWTP_ID);
  const latest = new Map<string, Row>();
  for (const r of rows) {
    const key = r.codi_sistema || r.sistema;
    const prev = latest.get(key);
    if (!prev || num(r.any) > num(prev.any)) latest.set(key, r);
  }
  const features: Plant[] = [];
  for (const r of latest.values()) {
    const lat = num(r.latitud);
    const lon = num(r.longitud);
    if (!lat || !lon) continue;
    const steps = [
      r.pretractament,
      r.tipus_tractament_primari,
      r.tipus_tractament_secundari,
      r.tipus_tractament_secundari_1,
      r.tipus_tractament_terciari,
      r.tipus_tractament_terciari_1,
      r.tipus_tractament_terciari_2,
      r.tipus_tractament_terciari_3,
      r.tipus_tractament_terciari_4,
    ].filter((s) => s && s !== "NA");
    features.push({
      id: `wwtp-${r.codi_sistema || r.sistema}`,
      kind: "wwtp",
      name: `EDAR ${titleCase(r.sistema)}`,
      lat,
      lon,
      municipi: r.municipi ?? "",
      comarca: r.comarca ?? "",
      operator: r.explotador ?? "",
      manager: r.ens_gestor ?? "",
      treatment: r.tipus_tractament ?? "",
      level: level(r),
      capacity: num(r.cabal_disseny),
      pe: num(r.habitants_equivalents),
      receiving: r.medi_receptor ?? "",
      year: r.any ?? "",
      steps,
      codiAglomeracio: r.codi_aglomeracio ?? "",
      factsheet: (r as unknown as { fitxa?: { url?: string } }).fitxa?.url,
    });
  }
  return { features, fetchedAt: new Date().toISOString(), fetchedCount: latest.size, latestDataDate: String(Math.max(...[...latest.values()].map((r) => num(r.any)))) };
}

export function titleCase(s: string) {
  return (s ?? "").toLowerCase().replace(/(^|[\s'(-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
}
