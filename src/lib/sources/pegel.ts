import type { Reservoir, SourceResult } from "../types";

// German federal waterways (WSV PEGELONLINE): live water level at ~800 gauges, CORS open.
// stateMnwMhw compares the current level with the gauge's mean low / mean high water.
const URL =
  "https://www.pegelonline.wsv.de/webservices/rest-api/v2/stations.json?includeTimeseries=true&includeCurrentMeasurement=true";

type State = "low" | "normal" | "high";
// Mapped onto the reservoir fill scale so the existing red/amber/green colours apply.
const FILL: Record<State, number> = { low: 15, normal: 55, high: 90 };
const LABEL: Record<State, string> = { low: "low water", normal: "normal level", high: "high water" };

interface Station {
  uuid: string;
  longname: string;
  latitude?: number;
  longitude?: number;
  water?: { longname: string };
  timeseries?: { shortname: string; currentMeasurement?: { timestamp: string; stateMnwMhw?: string } }[];
}

export async function fetchGauges(): Promise<SourceResult<Reservoir>> {
  const r = await fetch(URL);
  if (!r.ok) throw new Error(`PEGELONLINE HTTP ${r.status}`);
  const stations = (await r.json()) as Station[];
  const features: Reservoir[] = [];
  for (const s of stations) {
    const m = s.timeseries?.find((t) => t.shortname === "W")?.currentMeasurement;
    const state = m?.stateMnwMhw as State | undefined;
    if (!m || !state || !(state in FILL) || s.latitude == null || s.longitude == null) continue;
    const river = s.water?.longname ?? "";
    features.push({
      id: `gauge-${s.uuid}`,
      kind: "reservoir",
      name: `${s.longname}${river ? ` (${river})` : ""}`,
      lat: s.latitude,
      lon: s.longitude,
      fill: FILL[state],
      volume: 0,
      date: m.timestamp.slice(0, 10),
      note: LABEL[state],
    });
  }
  return { features, fetchedAt: new Date().toISOString() };
}

/** Share of gauges at low water: 0 = none, 1 = all. */
export function lowWaterShare(gauges: Reservoir[]): number | null {
  if (!gauges.length) return null;
  return gauges.filter((g) => g.fill === FILL.low).length / gauges.length;
}
