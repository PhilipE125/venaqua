// Pure screening helpers for the sourcing panel: provenance of computed numbers, the
// build-or-connect verdict, the shared-pipe option and risk levels. No cost model changes:
// these only combine results that costs.ts / companyEval.ts already produce.
import { crf, mid, type Range } from "./costs";
import type { Quality } from "./sources/contract";

export type InputQuality = Quality | "your figure";
export type Level = "Low" | "Medium" | "High";

/** A computed number takes the quality of its weakest input; all-measured inputs make it "modelled". */
export function weakest(inputs: InputQuality[]): Quality {
  return inputs.includes("assumption") ? "assumption" : "modelled";
}

export interface OptionCost {
  key: "own" | "connect" | "shared";
  label: string;
  annual: Range;
}

export interface Verdict {
  best: OptionCost;
  next: OptionCost | null;
  /** € a year: difference of mid annual costs (opportunity cost of choosing `next`). */
  perYear: number;
  /** € over the lifetime, discounted: perYear ÷ crf(rate, years). */
  lifetime: number;
  close: boolean;
}

/** Cheapest option by mid annual cost; "too close to call" when its range overlaps the next best. */
export function verdict(options: OptionCost[], rate: number, years: number): Verdict | null {
  const live = options.filter((o) => Number.isFinite(mid(o.annual)));
  if (!live.length) return null;
  const sorted = [...live].sort((a, b) => mid(a.annual) - mid(b.annual));
  const best = sorted[0]!;
  const next = sorted[1] ?? null;
  if (!next) return { best, next: null, perYear: 0, lifetime: 0, close: false };
  const perYear = mid(next.annual) - mid(best.annual);
  return { best, next, perYear, lifetime: perYear / crf(rate, years), close: best.annual[1] >= next.annual[0] };
}

/**
 * Your share of a shared pipe when `joining` of `members` companies take part. The trunk is split
 * by demand; the other joiners are assumed to bring the average demand of the other members.
 */
export function sharedPipeShare(myDemand: number, clusterDemand: number, members: number, joining: number) {
  const others = Math.max(0, clusterDemand - myDemand);
  const n = Math.max(1, members);
  const k = Math.max(1, Math.min(n, Math.round(joining)));
  const otherJoiners = n > 1 ? ((k - 1) / (n - 1)) * others : 0;
  const total = myDemand + otherJoiners;
  return total > 0 ? myDemand / total : 1;
}

/**
 * Option B with the pipe capex swapped for your share of a shared pipe. Everything else (reclaimed
 * price, polishing, pumping, mains top-up) stays exactly as evaluateOptions computed it.
 */
export function sharedOption(
  B: { annualCost: Range; capex: Range },
  clusterCapex: Range,
  share: number,
  rate: number,
  years: number,
  grantShare = 0,
  q: number,
) {
  const k = crf(rate, years);
  const g = 1 - Math.max(0, Math.min(0.5, grantShare));
  const capex: Range = [clusterCapex[0] * share * g, clusterCapex[1] * share * g];
  const annual: Range = [B.annualCost[0] - B.capex[0] * k + capex[0] * k, B.annualCost[1] - B.capex[1] * k + capex[1] * k];
  return { capex, annualCost: annual, perM3: (q > 0 ? [annual[0] / q, annual[1] / q] : [0, 0]) as Range };
}

/** Level of a yearly € exposure against the yearly water bill. Thresholds are settings (assumptions). */
export function riskLevel(eur: number, bill: number, t: { high: number; medium: number }): Level {
  if (bill <= 0) return "Low";
  const r = eur / bill;
  return r > t.high ? "High" : r > t.medium ? "Medium" : "Low";
}

/** Venaqua screening rule: how visible a site's water use would be in a shortage. */
export function visibilityLevel(
  i: { shareOfBusiness: number | null; residents: number | null; severeInRecord: boolean },
  t: { share: number; residents: number },
): Level {
  const big = (i.shareOfBusiness ?? 0) >= t.share || (i.residents ?? 0) >= t.residents;
  const n = Number(big) + Number(i.severeInRecord);
  return n === 2 ? "High" : n === 1 ? "Medium" : "Low";
}

/** Reservoir fill against the median for the same month. Venaqua screening rule. */
export function sourceStressLevel(fill: number, median: number): Level {
  if (fill < median - 20) return "High";
  if (fill < median) return "Medium";
  return "Low";
}

/** Median fill for a calendar month across a monthly series ("YYYY-MM"). */
export function monthMedian(series: { month: string; value: number }[], mm: string) {
  const v = series.filter((s) => s.month.slice(5, 7) === mm).map((s) => s.value).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m]! : (v[m - 1]! + v[m]!) / 2;
}
