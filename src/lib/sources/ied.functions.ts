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
  .validator((country: "ES" | "DE") => (country === "DE" ? "DE" : "ES"))
  .handler(async ({ data: country }) => {
  const hit = cache.get(country);
  if (hit && Date.now() - hit.at < DAY) return hit.data;
  type Row = {
    id: number;
    localId: string | null;
    facilityName: string | null;
    parentCompanyName: string | null;
    EPRTRAnnexIMainActivity: string | null;
    x_4326: number | null;
    y_4326: number | null;
    city: string | null;
    NUTS3: string | null;
  };
  // Facilities with releases to water (latest full year with reports): optional, fetched alongside the pages.
  const waterP = sql<{ localId: string }>(
    `SELECT DISTINCT f.localId FROM [IED].[latest].[ProductionFacility] f JOIN [IED].[latest].[ProductionFacilityReport] r ON r.localId=f.localId AND r.namespace=f.namespace AND r.reportingYear=f.reportingYear JOIN [IED].[latest].[PollutantRelease] p ON p.facilityReportId=r.Id WHERE f.countryCode='${country}' AND f.reportingYear=2023 AND p.mediumCode='WATER'`,
  )
    .then((w) => new Set(w.map((x) => x.localId.toUpperCase())))
    .catch(() => new Set<string>()); // skip the flag if the join is unavailable
  const rows: Row[] = [];
  let lastId = 0;
  for (let i = 0; i < 6; i++) {
    const page = await sql<Row>(
      `SELECT TOP 5000 id, localId, facilityName, parentCompanyName, EPRTRAnnexIMainActivity, x_4326, y_4326, city, NUTS3 FROM [IED].[latest].[ProductionFacility] WHERE countryCode='${country}' AND reportingYear=2024 AND status='functional' AND id > ${lastId} ORDER BY id`,
    );
    rows.push(...page);
    if (page.length < 5000) break;
    lastId = page.at(-1)!.id;
  }
  const water = await waterP;
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
      water: water.has((r.localId ?? "").toUpperCase()),
    }));
  const data = { facilities, fetched: rows.length, fetchedAt: new Date().toISOString() };
  cache.set(country, { at: Date.now(), data });
  return data;
});
