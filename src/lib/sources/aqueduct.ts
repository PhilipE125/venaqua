// Approximate water-stress multipliers for Catalan basins, read from WRI Aqueduct 4.0
// (baseline water stress and 2030/2050 business-as-usual projections). Not fetched live:
// Aqueduct has no keyless CORS API. Values are rounded and should be verified.
export const AQUEDUCT = {
  url: "https://www.wri.org/applications/aqueduct/water-risk-atlas/",
  baselineCategory: "Extremely high (>80%) in coastal internal basins",
  // Relative change in water stress vs baseline, used to scale non-normal drought phase frequency.
  points: [
    { year: 2025, factor: 1.0 },
    { year: 2030, factor: 1.1 },
    { year: 2050, factor: 1.3 },
  ],
};

/** Linear interpolation of the climate factor for a given year. */
export function climateFactor(year: number) {
  const p = AQUEDUCT.points;
  if (year <= p[0]!.year) return p[0]!.factor;
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1]!;
    const b = p[i]!;
    if (year <= b.year) return a.factor + ((b.factor - a.factor) * (year - a.year)) / (b.year - a.year);
  }
  return p.at(-1)!.factor;
}
