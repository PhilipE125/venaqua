// Pure: one ranked row per company for the module list. The chip answers "when does it
// become cheaper to install your own on-site reuse system?", so rows carry the own-plant
// payback year and the list is ordered by it, not by whichever route pays back first.
import { evaluateCompany } from "./companyEval";
import { defaultEffluent, mid } from "./costs";
import { GROWTH, projectFuture } from "./projection";
import { currentPhase, type DroughtEvent, type Phase } from "./sources/drought";
import type { Settings } from "./state";
import type { Company } from "./types";

export interface FlipRow {
  company: Company;
  option: "B" | "C"; // the reuse route that is cheapest to start with
  plant: string | null;
  perM3: number; // mid €/m³ of that option, including mains water it does not replace
  statusQuo: number; // €/m³ today: supply + discharge
  flipYear: number | null; // first year either reuse route beats the status quo
  ownFlipYear: number | null; // first year an own on-site plant beats the status quo
  own: number; // mid €/m³ of on-site reuse (C)
  connect: number | null; // mid €/m³ of the plant connection (B), when a plant is in reach
}

export interface FlipRowInput {
  company: Company;
  q: number; // m³/year
  tariff: number; // €/m³ supply today
  dischargeCharge: number; // €/m³ discharged
  plant: { name: string; straightKm: number; reuseReady: boolean; availableM3PerDay: number } | null;
  events: DroughtEvent[] | undefined;
  freq: Record<Phase, number>;
  settings: Settings;
}

/** One company through the shared model with default inputs: no road or elevation lookups. */
export function flipRowFor(i: FlipRowInput): FlipRow | null {
  if (i.q <= 0) return null;
  const r = evaluateCompany({
    q: i.q,
    tariff: i.tariff,
    dischargeCharge: i.dischargeCharge,
    rate: i.settings.rate,
    years: i.settings.years,
    electricity: i.settings.electricity.base,
    effluent: defaultEffluent(i.company.sector),
    plant: i.plant
      ? { straightKm: i.plant.straightKm, reuseReady: i.plant.reuseReady, availableM3PerDay: i.plant.availableM3PerDay }
      : null,
    cut: i.settings.droughtCut[currentPhase(i.events)?.phase ?? "normal"],
    events: i.events,
    settings: i.settings,
  });
  const f = projectFuture(r.future, GROWTH.mid, i.freq);
  const useB = !!r.B && (f.payB != null ? f.payC == null || f.payB <= f.payC : f.payC == null && mid(r.B.perM3) < mid(r.C.perM3));
  return {
    company: i.company,
    option: useB ? "B" : "C",
    plant: useB ? (i.plant?.name ?? null) : null,
    perM3: mid(useB ? r.B!.perM3 : r.C.perM3),
    statusQuo: mid(r.A.perM3),
    flipYear: useB ? f.payB : f.payC,
    ownFlipYear: f.payC,
    own: mid(r.C.perM3),
    connect: r.B ? mid(r.B.perM3) : null,
  };
}

/** Soonest own-plant payback first; sites that never pay back keep the cost gap as the tie-break. */
export function sortFlipRows(rows: FlipRow[]): FlipRow[] {
  return [...rows].sort(
    (a, b) => (a.ownFlipYear ?? 9999) - (b.ownFlipYear ?? 9999) || a.perM3 - a.statusQuo - (b.perM3 - b.statusQuo),
  );
}
