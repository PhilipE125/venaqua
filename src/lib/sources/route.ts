// Road route between a plant and a site (OSRM on OpenStreetMap; CORS open, no key).
// Reuse pipes are normally laid under roads, so the road route stands in for the pipe route.
// ponytail: public demo server, rate-limited and meant for light use; self-host OSRM or use
// OpenRouteService with a key if many routes are needed at once.
const API = "https://router.project-osrm.org/route/v1/driving";

export interface RoadRoute {
  km: number;
  path: [number, number][];
}

type Pt = { lat: number; lon: number };

export async function fetchRoadRoute(a: Pt, b: Pt): Promise<RoadRoute | null> {
  const r = await fetch(`${API}/${a.lon.toFixed(5)},${a.lat.toFixed(5)};${b.lon.toFixed(5)},${b.lat.toFixed(5)}?overview=full&geometries=geojson`);
  if (!r.ok) throw new Error(`OSRM HTTP ${r.status}`);
  const j = (await r.json()) as { code: string; routes?: { distance: number; geometry: { coordinates: [number, number][] } }[] };
  const best = j.routes?.[0];
  if (j.code !== "Ok" || !best) return null; // e.g. an island site with no road link
  // OSRM snaps both ends to the nearest road; join them back to the real points.
  return { km: best.distance / 1000, path: [[a.lon, a.lat], ...best.geometry.coordinates, [b.lon, b.lat]] };
}
