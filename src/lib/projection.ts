// Pure: future exposure. Tariff path, drought frequency scaled by climate stress,
// cumulative cost per option and the first year reuse pays off.
import { PHASES, phaseDaysInYear, type DroughtEvent, type Phase } from "./sources/drought";

export const tariffAt = (base: number, ratePerYear: number, yearsFromNow: number) => base * (1 + ratePerYear) ** yearsFromNow;

/** Average share of each year spent in each phase over a historical window. */
export function phaseFrequencies(events: DroughtEvent[] | undefined, from: number, to: number): Record<Phase, number> {
  const acc: Record<Phase, number> = { normal: 0, "pre-alert": 0, alert: 0, exceptional: 0, emergency: 0 };
  const n = to - from + 1;
  if (!events?.length || n <= 0) return { ...acc, normal: 1 };
  for (let y = from; y <= to; y++) {
    const d = phaseDaysInYear(events, y);
    const total = PHASES.reduce((s, p) => s + d[p], 0) || 365;
    for (const p of PHASES) acc[p] += d[p] / total / n;
  }
  return acc;
}

/** Expected supply-cut share per year; non-normal phases scaled by a climate factor, capped at 100%. */
export function expectedCut(freq: Record<Phase, number>, cuts: Record<Phase, number>, climateFactor: number) {
  return Math.min(1, PHASES.reduce((s, p) => s + freq[p] * (p === "normal" ? 1 : climateFactor) * cuts[p], 0));
}

export interface OptionPath {
  capex: number; // spent in year 0
  opex: (tariff: number, cutShare: number) => number; // annual running cost incl. drought loss
}

export function cumulative(paths: Record<string, OptionPath>, years: number[], tariffFor: (y: number) => number, cutFor: (y: number) => number) {
  const totals: Record<string, number> = Object.fromEntries(Object.entries(paths).map(([k, p]) => [k, p.capex]));
  return years.map((y) => {
    const row: Record<string, number> = { year: y };
    for (const [k, p] of Object.entries(paths)) {
      totals[k]! += p.opex(tariffFor(y), cutFor(y));
      row[k] = totals[k]!;
    }
    return row;
  });
}

/** First year an option's cumulative cost drops below the status quo. */
export function paybackYear(rows: Record<string, number>[], option: string, base = "A"): number | null {
  for (const r of rows) if (r[option]! <= r[base]!) return r["year"]!;
  return null;
}
