import { createServerFn } from "@tanstack/react-start";

// EEA discodata has no CORS guarantees, so it is proxied server-side and cached for 24h.
export interface IedFacility {
  id: number;
  name: string;
  parent: string;
  activity: string;
  lat: number;
  lon: number;
  city: string;
  nuts3: string;
  water: boolean;
}

const DAY = 24 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; data: { facilities: IedFacility[]; fetched: number; fetchedAt: string } }>();

async function sql<T>(query: string): Promise<T[]> {
  const r = await fetch(`https://discodata.eea.europa.eu/sql?query=${encodeURIComponent(query)}`, {
    headers: { accept: "application/json" },
  });
  if (!r.ok) throw new Error(`discodata HTTP ${r.status}`);
  const j = (await r.json()) as { results?: T[]; errors?: { error: string }[] };
  if (j.errors?.length) throw new Error(j.errors[0]!.error);
  return j.results ?? [];
}

export const fetchIed = createServerFn({ method: "GET" })
  .inputValidator((country: "ES" | "DE") => (country === "DE" ? "DE" : "ES"))
  .handler(async ({ data: country }) => {
  const hit = cache.get(country);
  if (hit && Date.now() - hit.at < DAY) return hit.data;
  type Row = {
    id: number;
    facilityName: string | null;
    parentCompanyName: string | null;
    EPRTRAnnexIMainActivity: string | null;
    x_4326: number | null;
    y_4326: number | null;
    city: string | null;
    NUTS3: string | null;
  };
  const rows: Row[] = [];
  let lastId = 0;
  for (let i = 0; i < 6; i++) {
    const page = await sql<Row>(
      `SELECT TOP 5000 id, facilityName, parentCompanyName, EPRTRAnnexIMainActivity, x_4326, y_4326, city, NUTS3 FROM [IED].[latest].[ProductionFacility] WHERE countryCode='${country}' AND reportingYear=2024 AND status='functional' AND id > ${lastId} ORDER BY id`,
    );
    rows.push(...page);
    if (page.length < 5000) break;
    lastId = page.at(-1)!.id;
  }
  // Optional: facilities with releases to water (latest full year with reports).
  let water = new Set<string>();
  try {
    const w = await sql<{ localId: string }>(
      `SELECT DISTINCT f.localId FROM [IED].[latest].[ProductionFacility] f JOIN [IED].[latest].[ProductionFacilityReport] r ON r.localId=f.localId AND r.namespace=f.namespace AND r.reportingYear=f.reportingYear JOIN [IED].[latest].[PollutantRelease] p ON p.facilityReportId=r.Id WHERE f.countryCode='${country}' AND f.reportingYear=2023 AND p.mediumCode='WATER'`,
    );
    water = new Set(w.map((x) => x.localId.toUpperCase()));
  } catch {
    /* optional flag; skip if the join is unavailable */
  }
  let localIds = new Map<number, string>();
  if (water.size) {
    const ids = await sql<{ id: number; localId: string }>(
      `SELECT id, localId FROM [IED].[latest].[ProductionFacility] WHERE countryCode='${country}' AND reportingYear=2024 AND status='functional'`,
    );
    localIds = new Map(ids.map((x) => [x.id, x.localId.toUpperCase()]));
  }
  const facilities: IedFacility[] = rows
    .filter((r) => r.x_4326 && r.y_4326)
    .map((r) => ({
      id: r.id,
      name: r.facilityName ?? r.parentCompanyName ?? "Unknown",
      parent: r.parentCompanyName ?? "",
      activity: r.EPRTRAnnexIMainActivity ?? "",
      lat: Number(r.y_4326),
      lon: Number(r.x_4326),
      city: r.city ?? "",
      nuts3: r.NUTS3 ?? "",
      water: water.has(localIds.get(r.id) ?? ""),
    }));
  const data = { facilities, fetched: rows.length, fetchedAt: new Date().toISOString() };
  cache.set(country, { at: Date.now(), data });
  return data;
});
