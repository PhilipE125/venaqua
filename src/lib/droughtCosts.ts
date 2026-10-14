/** Pure commercial disruption sensitivity. No tariff forecast or event probabilities. */
export interface DroughtCostInputs {
  dailyDemand: number;
  restrictionDays: number;
  lossPerM3: number;
  backupShare: number;
  backupPremium: number;
  responseCost: number;
  protectedShare: number;
}

export const DROUGHT_COST_SCENARIOS = [
  { id: "contained", label: "Contained scarcity", cut: 0.15, durationGrowth: 0, color: "var(--chart-1)" },
  { id: "prolonged", label: "Prolonged restrictions", cut: 0.25, durationGrowth: 0.02, color: "var(--chart-3)" },
  { id: "persistent", label: "Persistent scarcity", cut: 0.25, durationGrowth: 0.05, color: "var(--chart-4)" },
] as const;

export function droughtEventCost(i: DroughtCostInputs, cut: number, days = i.restrictionDays) {
  const values = [...Object.values(i), cut, days];
  if (values.some((v) => !Number.isFinite(v) || v < 0) || days > 365 || i.restrictionDays > 365 || cut > 1 || i.backupShare > 1 || i.protectedShare > 1) {
    throw new RangeError("Use finite non-negative values, shares from 0 to 1 and up to 365 restriction days.");
  }
  const affectedVolume = i.dailyDemand * days * cut * (1 - i.protectedShare);
  const backupVolume = affectedVolume * i.backupShare;
  const unmetVolume = affectedVolume - backupVolume;
  const disruption = unmetVolume * i.lossPerM3;
  const mitigation = backupVolume * i.backupPremium;
  const response = affectedVolume > 0 ? i.responseCost : 0;
  return { affectedVolume, unmetVolume, backupVolume, disruption, mitigation, response, total: disruption + mitigation + response };
}

export function restrictionDaysAt(days: number, annualGrowth: number, ahead: number) {
  if (!Number.isFinite(days) || days < 0 || days > 365 || !Number.isFinite(annualGrowth) || annualGrowth < 0 || !Number.isInteger(ahead) || ahead < 0) throw new RangeError("Invalid duration sensitivity.");
  return Math.min(365, days * (1 + annualGrowth) ** ahead);
}

export function droughtCostOutlook(i: DroughtCostInputs, baseYear = 2026, horizon = 15) {
  if (!Number.isInteger(baseYear) || !Number.isInteger(horizon) || horizon < 0) throw new RangeError("Use whole years.");
  return Array.from({ length: horizon + 1 }, (_, ahead) => ({
    year: baseYear + ahead,
    contained: droughtEventCost(i, 0.15, restrictionDaysAt(i.restrictionDays, 0, ahead)).total,
    prolonged: droughtEventCost(i, 0.25, restrictionDaysAt(i.restrictionDays, 0.02, ahead)).total,
    persistent: droughtEventCost(i, 0.25, restrictionDaysAt(i.restrictionDays, 0.05, ahead)).total,
  }));
}

/** Incremental resilience benefit only; frequency and project costs are user assumptions. */
export function reuseInvestmentCase(i: DroughtCostInputs, cut: number, days: number, project: {
  additionalProtectedShare: number; capitalCost: number; annualOperatingCost: number; eventsPerYear: number; years: number;
}) {
  if (Object.values(project).some(v => !Number.isFinite(v) || v < 0) || project.additionalProtectedShare > 1 || project.years <= 0) throw new RangeError("Invalid reuse investment assumptions.");
  const protectedShare = Math.min(1, i.protectedShare + project.additionalProtectedShare);
  const baseline = droughtEventCost(i, cut, days);
  const withReuse = droughtEventCost({ ...i, protectedShare }, cut, days);
  const avoidedPerEvent = baseline.total - withReuse.total;
  const annualAvoided = avoidedPerEvent * project.eventsPerYear;
  const annualNet = annualAvoided - project.annualOperatingCost;
  return { baseline, withReuse, protectedShare, avoidedPerEvent, annualAvoided, annualNet,
    protectedVolume: baseline.affectedVolume - withReuse.affectedVolume,
    netOverPeriod: annualNet * project.years - project.capitalCost,
    simplePayback: annualNet > 0 ? project.capitalCost / annualNet : null };
}