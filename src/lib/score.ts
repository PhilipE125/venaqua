// Pure opportunity scoring. No React, no I/O.

export interface LatLon {
  lat: number;
  lon: number;
}

export function haversineKm(a: LatLon, b: LatLon): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Exponent weights for custom scoring; all 1 reproduces the default formula. */
export interface ScoreWeights { volume: number; stress: number; distance: number }
export const DEFAULT_WEIGHTS: ScoreWeights = { volume: 1, stress: 1, distance: 1 };

/** score = min(supply, demand)^wv * (1 + stress)^ws / (1 + distance_km)^wd */
export function rawScore(p: { supply: number; demand: number; stress: number; distanceKm: number }, w: ScoreWeights = DEFAULT_WEIGHTS) {
  const stress = Math.max(0, Math.min(1, p.stress));
  return (Math.min(p.supply, p.demand) ** w.volume * (1 + stress) ** w.stress) / (1 + Math.max(0, p.distanceKm)) ** w.distance;
}

export interface ScoreSite extends LatLon {
  id: string;
  supply: number; // already doubled for reuse-ready plants
}
export interface ScoreCompany extends LatLon {
  id: string;
  demand: number;
}
export interface Match {
  siteId: string;
  companyId: string;
  distanceKm: number;
  matched: number; // m3/day
  raw: number;
  score: number; // 0-100
}

export function effectiveSupply(capacity: number, reuseReady: boolean) {
  return (capacity || 0) * (reuseReady ? 2 : 1);
}

export function scorePairs(
  sites: ScoreSite[],
  companies: ScoreCompany[],
  opts: { maxKm: number; stress: number; weights?: ScoreWeights },
): Match[] {
  const out: Match[] = [];
  const dLat = opts.maxKm / 111;
  // Sorted by latitude so each site only scans the companies in its latitude band.
  const byLat = [...companies].sort((a, b) => a.lat - b.lat);
  for (const s of sites) {
    if (!(s.supply > 0)) continue;
    const dLon = opts.maxKm / (111 * Math.cos((s.lat * Math.PI) / 180));
    let lo = 0, hi = byLat.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (byLat[mid]!.lat < s.lat - dLat) lo = mid + 1;
      else hi = mid;
    }
    for (let i = lo; i < byLat.length && byLat[i]!.lat <= s.lat + dLat; i++) {
      const c = byLat[i]!;
      if (Math.abs(c.lon - s.lon) > dLon) continue;
      const d = haversineKm(s, c);
      if (d > opts.maxKm) continue;
      const raw = rawScore({ supply: s.supply, demand: c.demand, stress: opts.stress, distanceKm: d }, opts.weights);
      out.push({ siteId: s.id, companyId: c.id, distanceKm: d, matched: Math.min(s.supply, c.demand), raw, score: 0 });
    }
  }
  return normalizeScores(out);
}

export function normalizeScores(matches: Match[]): Match[] {
  const max = matches.reduce((m, x) => Math.max(m, x.raw), 0);
  for (const m of matches) m.score = max > 0 ? (m.raw / max) * 100 : 0;
  return matches;
}

export function businessCase(p: {
  distanceKm: number;
  matchedM3PerDay: number;
  pipeCostPerKm: number;
  tariff: number;
  reclaimedPrice: number;
}) {
  const pipeCost = p.distanceKm * p.pipeCostPerKm;
  const annualM3 = p.matchedM3PerDay * 365;
  const annualSavings = annualM3 * (p.tariff - p.reclaimedPrice);
  const paybackYears = annualSavings > 0 ? pipeCost / annualSavings : null;
  return { pipeCost, annualM3, annualSavings, paybackYears };
}
