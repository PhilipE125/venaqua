// Pure: shared-pipe clusters. Companies near one plant that sit in the same direction
// can share one trunk pipe with short spurs.
import { crf, mid, type Range } from "./costs";
import { haversineKm, type LatLon } from "./score";

export interface ClusterCompany extends LatLon {
  id: string;
  demand: number; // m3/day
}
export interface ClusterPlant extends LatLon {
  id: string;
  available: number; // m3/day
}
export interface Cluster {
  plantId: string;
  companyIds: string[];
  demand: number; // m3/day, combined
  delivered: number; // m3/day, capped by plant
  trunkKm: number;
  spurKm: number;
  capex: Range;
  costPerM3: Range; // pipe cost only, annualised
  hull: [number, number][]; // [lon, lat]
}

export function bearingDeg(a: LatLon, b: LatLon) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const y = Math.sin(toRad(b.lon - a.lon)) * Math.cos(toRad(b.lat));
  const x = Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) - Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lon - a.lon));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

const angDiff = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

/** Monotone-chain convex hull over [lon, lat] points. */
export function convexHull(pts: [number, number][]): [number, number][] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o: number[], a: number[], b: number[]) => (a[0]! - o[0]!) * (b[1]! - o[1]!) - (a[1]! - o[1]!) * (b[0]! - o[0]!);
  const lower: [number, number][] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower.at(-2)!, lower.at(-1)!, q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: [number, number][] = [];
  for (const q of [...p].reverse()) {
    while (upper.length >= 2 && cross(upper.at(-2)!, upper.at(-1)!, q) <= 0) upper.pop();
    upper.push(q);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

export function findClusters(
  plants: ClusterPlant[],
  companies: ClusterCompany[],
  opts: { maxKm: number; sectorDeg?: number; minSize?: number; pipeCostPerKm: Range; rate: number; years: number },
): Cluster[] {
  const sectorDeg = opts.sectorDeg ?? 35;
  const minSize = opts.minSize ?? 3;
  const k = crf(opts.rate, opts.years);
  const out: Cluster[] = [];
  for (const p of plants) {
    if (!(p.available > 0)) continue;
    const near = companies
      .map((c) => ({ c, d: haversineKm(p, c), b: bearingDeg(p, c) }))
      .filter((x) => x.d <= opts.maxKm && x.c.demand > 0)
      .sort((a, b) => a.b - b.b);
    const used = new Set<string>();
    for (const seed of near) {
      if (used.has(seed.c.id)) continue;
      const group = near.filter((x) => !used.has(x.c.id) && angDiff(x.b, seed.b) <= sectorDeg / 2 + 0.0001 && angDiff(x.b, seed.b) >= 0 && x.b >= seed.b - 0.0001 ? true : !used.has(x.c.id) && angDiff(x.b, seed.b) <= sectorDeg / 2 && x.b >= seed.b);
      if (group.length < minSize) continue;
      group.forEach((x) => used.add(x.c.id));
      const axis = group.reduce((s, x) => s + x.b, 0) / group.length;
      const trunkKm = Math.max(...group.map((x) => x.d * Math.cos(((x.b - axis) * Math.PI) / 180)));
      const spurKm = group.reduce((s, x) => s + Math.abs(x.d * Math.sin(((x.b - axis) * Math.PI) / 180)), 0);
      const demand = group.reduce((s, x) => s + x.c.demand, 0);
      const delivered = Math.min(demand, p.available);
      const len = trunkKm + spurKm;
      const capex: Range = [len * opts.pipeCostPerKm[0], len * opts.pipeCostPerKm[1]];
      const annualM3 = delivered * 365;
      out.push({
        plantId: p.id,
        companyIds: group.map((x) => x.c.id),
        demand,
        delivered,
        trunkKm,
        spurKm,
        capex,
        costPerM3: annualM3 > 0 ? [(capex[0] * k) / annualM3, (capex[1] * k) / annualM3] : [Infinity, Infinity],
        hull: convexHull([[p.lon, p.lat], ...group.map((x) => [x.c.lon, x.c.lat] as [number, number])]),
      });
    }
  }
  return out.sort((a, b) => mid(a.costPerM3) - mid(b.costPerM3));
}
