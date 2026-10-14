// Pure: future exposure. Tariff path, drought frequency scaled by climate stress,
// cumulative cost per option and the first year reuse pays off.
import { climateFactor } from "./sources/aqueduct";
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

/** Years the drought log actually covers: first to last event year. */
export function droughtWindow(events: DroughtEvent[] | undefined): [number, number] | null {
  if (!events?.length) return null;
  return [Number(events[0]!.date.slice(0, 4)), Number(events.at(-1)!.date.slice(0, 4))];
}

/** Phase frequencies over the years the log covers, so years before it starts don't count as normal. */
export function historicFrequencies(events: DroughtEvent[] | undefined) {
  const w = droughtWindow(events);
  return w ? phaseFrequencies(events, w[0], w[1]) : phaseFrequencies(undefined, 0, 0);
}

export const droughtRecordLabel = (events: DroughtEvent[] | undefined) => {
  const w = droughtWindow(events);
  return w ? `drought frequency from the ${w[0]}-${w[1]} record, which includes the 2022-24 drought` : "no drought record for this area, so every year counts as normal";
};

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

export const FUTURE_START = 2026;
export const FUTURE_END = 2050;
export const GROWTH = { low: 0.01, mid: 0.03, high: 0.05 } as const;

export interface FutureInputs {
  q: number;
  tariff0: number;
  dischargeCharge: number;
  valuePerM3Lost: number;
  cuts: Record<Phase, number>;
  events: DroughtEvent[] | undefined;
  B: { capex: number; opexAtT0: number; mainsShare: number; coverage: number } | null;
  C: { capex: number; opexAtT0: number; mainsShare: number; protectedShare: number };
}

/** Cumulative cost of A/B/C from FUTURE_START to FUTURE_END and the first year B or C beats A. */
export function projectFuture(i: FutureInputs, growth: number, freq = historicFrequencies(i.events)) {
  const years = Array.from({ length: FUTURE_END - FUTURE_START + 1 }, (_, k) => FUTURE_START + k);
  const tariffFor = (y: number) => tariffAt(i.tariff0, growth, y - FUTURE_START);
  const cutFor = (y: number) => expectedCut(freq, i.cuts, climateFactor(y));
  const loss = (cut: number, protectedShare: number) => i.q * cut * i.valuePerM3Lost * (1 - protectedShare);
  const paths: Record<string, OptionPath> = {
    A: { capex: 0, opex: (t, cut) => i.q * (t + i.dischargeCharge) + loss(cut, 0) },
    C: { capex: i.C.capex, opex: (t, cut) => i.C.opexAtT0 + i.q * i.C.mainsShare * (t - i.tariff0) + loss(cut, i.C.protectedShare) },
  };
  if (i.B) {
    const b = i.B;
    paths["B"] = { capex: b.capex, opex: (t, cut) => b.opexAtT0 + i.q * b.mainsShare * (t - i.tariff0) + loss(cut, b.coverage) };
  }
  const rows = cumulative(paths, years, tariffFor, cutFor);
  return { rows, freq, tariffFor, cutFor, payB: i.B ? paybackYear(rows, "B") : null, payC: paybackYear(rows, "C") };
}
