import { EFFLUENT, evaluateOptions } from "./costs";
import type { Settings } from "./state";
import type { DroughtEvent } from "./sources/drought";

/**
 * One place that turns a company's scenario inputs into the A/B/C evaluation.
 * Used by the ranked list, the sourcing panel and the full cost-benefit so they never drift apart.
 */
export interface CompanyEvalInput {
  q: number; // m³/year
  tariff: number; // € per m³ supply, before shock
  tariffShockPct?: number;
  dischargeCharge: number; // € per m³ discharged
  dischargePct?: number; // share of water discharged, default 80
  rate: number;
  years: number;
  electricity: number; // €/kWh
  effluent: keyof typeof EFFLUENT;
  plant: { straightKm: number; reuseReady: boolean; availableM3PerDay: number } | null;
  roadKm?: number | null; // real road distance when known
  heightM?: number | null; // elevation gain plant → company when known
  cut: number;
  events: DroughtEvent[] | undefined;
  settings: Settings;
}

export function evaluateCompany(i: CompanyEvalInput) {
  const s = i.settings;
  const tariff = i.tariff * (1 + (i.tariffShockPct ?? 0) / 100);
  // Road distance when the router answered; otherwise straight line × detour factor.
  const distanceKm = i.plant ? (i.roadKm ?? i.plant.straightKm * s.detourFactor) : 0;
  const liftM = Math.max(0, i.heightM ?? 0) + (s.frictionPer10km * distanceKm) / 10;
  const r = evaluateOptions({
    q: i.q,
    tariff,
    dischargeCharge: i.dischargeCharge * ((i.dischargePct ?? 80) / 100),
    rate: i.rate,
    years: i.years,
    electricity: i.electricity,
    plant: i.plant ? { distanceKm, liftM, reuseReady: i.plant.reuseReady, availableM3PerDay: i.plant.availableM3PerDay } : null,
    effluentK: EFFLUENT[i.effluent].k,
    cut: i.cut,
    events: i.events,
    s,
  });
  return { ...r, tariff, distanceKm, liftM };
}

/** One candidate plant through the same evaluation as the answer, so a row and the answer always agree. */
export function evaluateCandidate(
  base: Omit<CompanyEvalInput, "plant" | "roadKm" | "heightM">,
  cand: { d: number; p: { supply: { reuseReady: boolean; availableReclaimed: number } } } | null,
  geo?: { roadKm?: number | null; heightM?: number | null },
) {
  return evaluateCompany({
    ...base,
    plant: cand ? { straightKm: cand.d, reuseReady: cand.p.supply.reuseReady, availableM3PerDay: cand.p.supply.availableReclaimed } : null,
    roadKm: geo?.roadKm ?? null,
    heightM: geo?.heightM ?? null,
  });
}
