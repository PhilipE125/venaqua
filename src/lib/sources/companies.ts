import { sectorFromCcae } from "../sectors";
import type { Company, SourceResult } from "../types";
import { num, socrata } from "./socrata";

export const COMPANIES_ID = "rneu-w4f4";

export async function fetchCompanies(): Promise<SourceResult<Company>> {
  const rows = await socrata(COMPANIES_ID, {
    $select: "n_m_inscripci,titular,terme_municipal,ccae,activitat_contaminant,tipus,subtipus,latitud,longitud",
  });
  const features: Company[] = [];
  for (const r of rows) {
    const lat = num(r.latitud);
    const lon = num(r.longitud);
    if (!lat || !lon || lat < 40 || lat > 43.2 || lon < 0 || lon > 3.5) continue;
    features.push({
      id: `co-${r.n_m_inscripci}`,
      kind: "company",
      name: r.titular ?? "Unknown",
      lat,
      lon,
      municipi: r.terme_municipal ?? "",
      ccae: r.ccae ?? "",
      activity: r.activitat_contaminant ?? "",
      sector: sectorFromCcae(`${r.ccae ?? ""} ${r.activitat_contaminant ?? ""}`),
      tipus: r.tipus ?? "",
      subtipus: r.subtipus ?? "",
    });
  }
  return { features, fetchedAt: new Date().toISOString() };
}
