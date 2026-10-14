// Pure cost model for the A/B/C water options. No React, no I/O.
// All money values are [low, high] ranges.
import type { FutureInputs } from "./projection";
import type { DroughtEvent, Phase } from "./sources/drought";

export type Range = [number, number];

export const r = (lo: number, hi: number): Range => [Math.min(lo, hi), Math.max(lo, hi)];
export const add = (a: Range, b: Range): Range => [a[0] + b[0], a[1] + b[1]];
export const scale = (a: Range, k: number): Range => r(a[0] * k, a[1] * k);
export const mid = (a: Range) => (a[0] + a[1]) / 2;

/** Capital recovery factor. */
export function crf(rate: number, years: number) {
  if (years <= 0) return 1;
  if (rate === 0) return 1 / years;
  const f = (1 + rate) ** years;
  return (rate * f) / (f - 1);
}

export interface CostInputs {
  demandM3PerYear: number;
  tariff: number; // €/m3
  dischargeCharge: number; // €/m3
  rate: number;
  years: number;
  electricity: Range; // €/kWh
}

export interface OptionResult {
  annualCost: Range;
  perM3: Range;
  capex: Range;
  /** simple payback vs status quo, years (low = best case) */
  payback: Range | null;
}

function finish(annual: Range, capex: Range, q: number): OptionResult {
  const perM3: Range = q > 0 ? [annual[0] / q, annual[1] / q] : [0, 0];
  return { annualCost: annual, perM3, capex, payback: null };
}

export function optionA(i: CostInputs): OptionResult {
  const v = i.demandM3PerYear * (i.tariff + i.dischargeCharge);
  return finish([v, v], [0, 0], i.demandM3PerYear);
}

export interface GridInputs {
  distanceKm: number; // already including detour
  liftM: number;
  pumpEfficiency: number;
  pipeCostPerKm: Range;
  polishing: Range; // €/m3, zero range if plant is reuse-ready
  reclaimedPrice: Range;
  availableM3PerDay: number;
}

/** kWh per m3 to lift water liftM metres: ρgh / 3.6e6 / η = 0.002725 × h / η */
export const pumpingKWhPerM3 = (liftM: number, eff: number) => (0.002725 * Math.max(0, liftM)) / Math.max(0.1, eff);

export function optionB(i: CostInputs, g: GridInputs) {
  const q = i.demandM3PerYear;
  const deliverable = Math.min(q, Math.max(0, g.availableM3PerDay) * 365);
  const capex = scale(g.pipeCostPerKm, g.distanceKm);
  const kwh = pumpingKWhPerM3(g.liftM, g.pumpEfficiency);
  const unit = add(add(g.reclaimedPrice, g.polishing), scale(i.electricity, kwh));
  const k = crf(i.rate, i.years);
  const annual = add(
    add(scale(capex, k), scale(unit, deliverable)),
    [(q - deliverable) * i.tariff + q * i.dischargeCharge, (q - deliverable) * i.tariff + q * i.dischargeCharge],
  );
  const opex = add(scale(unit, deliverable), [(q - deliverable) * i.tariff + q * i.dischargeCharge, (q - deliverable) * i.tariff + q * i.dischargeCharge]);
  const res = finish(annual, capex, q);
  return { ...res, payback: payback(capex, optionA(i).annualCost[0], opex), deliverable, kwhPerM3: kwh, coverage: q > 0 ? deliverable / q : 0 };
}

export interface OnsiteInputs {
  recoveryRate: Range; // share of demand recycled
  capexPerM3Day: Range; // € per m3/day of capacity
  opex: Range; // €/m3 recycled
}

export function optionC(i: CostInputs, o: OnsiteInputs) {
  const q = i.demandM3PerYear;
  // Low case pairs the cheaper capex/opex with the higher recovery; computed per corner.
  const corners = [0, 1].flatMap((a) =>
    [0, 1].flatMap((b) =>
      [0, 1].map((c) => {
        const rec = o.recoveryRate[a]!;
        const recycled = q * rec;
        const capex = o.capexPerM3Day[b]! * (recycled / 365);
        const annual = capex * crf(i.rate, i.years) + recycled * o.opex[c]! + (q - recycled) * (i.tariff + i.dischargeCharge);
        return { capex, annual, opex: recycled * o.opex[c]! + (q - recycled) * (i.tariff + i.dischargeCharge) };
      }),
    ),
  );
  const annual = r(Math.min(...corners.map((x) => x.annual)), Math.max(...corners.map((x) => x.annual)));
  const capex = r(Math.min(...corners.map((x) => x.capex)), Math.max(...corners.map((x) => x.capex)));
  const opexR = r(Math.min(...corners.map((x) => x.opex)), Math.max(...corners.map((x) => x.opex)));
  const res = finish(annual, capex, q);
  return { ...res, payback: payback(capex, optionA(i).annualCost[0], opexR), recycled: scale(o.recoveryRate, q) };
}

/** Simple payback: capex / (status quo − annual opex). */
export function payback(capex: Range, statusQuo: number, opex: Range): Range | null {
  const sLo = statusQuo - opex[1];
  const sHi = statusQuo - opex[0];
  if (sHi <= 0) return null;
  const best = capex[0] / sHi;
  const worst = sLo > 0 ? capex[1] / sLo : Infinity;
  return [best, worst];
}

/** Lost value from supply cuts. Share covered by reclaimed/recycled water is unaffected. */
export function droughtLoss(q: number, cutShare: number, valuePerM3: number, protectedShare = 0) {
  return q * Math.max(0, cutShare) * valuePerM3 * (1 - Math.max(0, Math.min(1, protectedShare)));
}

/** A − min(B, C) plus drought loss avoided. */
export function opportunityCost(a: Range, b: Range, c: Range, droughtA: number, droughtBest: number): Range {
  const best = b[0] <= c[0] ? b : c;
  const lo = a[0] - best[1] + (droughtA - droughtBest);
  const hi = a[1] - best[0] + (droughtA - droughtBest);
  return r(lo, hi);
}

/**
 * Rough €/m³ to take reclaimed water from a plant: pipe capex annualised over the delivered
 * volume, plus polishing when the plant is not reuse-ready. Used only to rank candidate plants;
 * the full option-B model (pumping, reclaimed price, shortfall) runs on the chosen one.
 */
export function supplyCostPerM3(
  p: { distanceKm: number; reuseReady: boolean; availableM3PerDay: number },
  demandM3PerYear: number,
  s: { detourFactor: number; pipeCostPerKm: Range; polishing: Range; rate: number; years: number },
) {
  const delivered = Math.min(demandM3PerYear, p.availableM3PerDay * 365);
  if (delivered <= 0) return Infinity;
  const pipe = (mid(s.pipeCostPerKm) * p.distanceKm * s.detourFactor * crf(s.rate, s.years)) / delivered;
  return pipe + (p.reuseReady ? 0 : mid(s.polishing));
}

export const EFFLUENT = { light: { label: "Light (cooling, rinsing)", k: 0.8 }, medium: { label: "Medium (mixed process)", k: 1 }, heavy: { label: "Heavy (food, chemicals)", k: 1.4 } } as const;
export const defaultEffluent = (sector: string): keyof typeof EFFLUENT => (sector === "food" || sector === "chemicals" ? "heavy" : "medium");

export interface EvaluateInputs {
  q: number; // m3/year
  tariff: number;
  dischargeCharge: number; // already scaled by the discharged share
  rate: number;
  years: number;
  electricity: number;
  plant: { distanceKm: number; liftM: number; reuseReady: boolean; availableM3PerDay: number } | null;
  effluentK: number; // on-site cost multiplier for effluent strength
  cut: number; // supply-cut share used for today's drought loss
  events: DroughtEvent[] | undefined;
  s: {
    pumpEfficiency: number;
    pipeCostPerKm: Range;
    polishing: Range;
    reclaimedPrice: Range;
    recoveryRate: Range;
    onsiteCapex: Range;
    onsiteOpex: Range;
    droughtCut: Record<Phase, number>;
    valuePerM3Lost: number;
  };
}

/** A/B/C for one company, the cheapest today (incl. drought loss) and the inputs for the future projection. */
export function evaluateOptions(i: EvaluateInputs) {
  const { q, s } = i;
  const inputs: CostInputs = { demandM3PerYear: q, tariff: i.tariff, dischargeCharge: i.dischargeCharge, rate: i.rate, years: i.years, electricity: [i.electricity, i.electricity] };
  const A = optionA(inputs);
  const B = i.plant
    ? optionB(inputs, {
        distanceKm: i.plant.distanceKm,
        liftM: i.plant.liftM,
        pumpEfficiency: s.pumpEfficiency,
        pipeCostPerKm: s.pipeCostPerKm,
        polishing: i.plant.reuseReady ? [0, 0] : s.polishing,
        reclaimedPrice: s.reclaimedPrice,
        availableM3PerDay: i.plant.availableM3PerDay,
      })
    : null;
  const C = optionC(inputs, { recoveryRate: s.recoveryRate, capexPerM3Day: scale(s.onsiteCapex, i.effluentK), opex: scale(s.onsiteOpex, i.effluentK) });
  const lossA = droughtLoss(q, i.cut, s.valuePerM3Lost);
  const lossB = B ? droughtLoss(q, i.cut, s.valuePerM3Lost, B.coverage) : lossA;
  const lossC = droughtLoss(q, i.cut, s.valuePerM3Lost, mid(s.recoveryRate));
  const bAnnual = B?.annualCost ?? ([Infinity, Infinity] as Range);
  const bestIsB = !!B && mid(bAnnual) + lossB < mid(C.annualCost) + lossC;
  const opp = opportunityCost(A.annualCost, bAnnual, C.annualCost, lossA, bestIsB ? lossB : lossC);
  const cheapest: "A" | "B" | "C" = mid(A.annualCost) + lossA <= Math.min(mid(bAnnual) + lossB, mid(C.annualCost) + lossC) ? "A" : bestIsB ? "B" : "C";
  const k = crf(i.rate, i.years);
  const future: FutureInputs = {
    q,
    tariff0: i.tariff,
    dischargeCharge: i.dischargeCharge,
    valuePerM3Lost: s.valuePerM3Lost,
    cuts: s.droughtCut,
    events: i.events,
    B: B ? { capex: mid(B.capex), opexAtT0: mid(B.annualCost) - mid(B.capex) * k, mainsShare: 1 - B.coverage, coverage: B.coverage } : null,
    C: { capex: mid(C.capex), opexAtT0: mid(C.annualCost) - mid(C.capex) * k, mainsShare: 1 - mid(s.recoveryRate), protectedShare: mid(s.recoveryRate) },
  };
  return { A, B, C, lossA, lossB, lossC, opp, cheapest, future };
}
