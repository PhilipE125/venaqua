import { describe, expect, it } from "vitest";
import { droughtEventCost, droughtCostOutlook, restrictionDaysAt, reuseInvestmentCase, type DroughtCostInputs } from "./droughtCosts";

const inputs: DroughtCostInputs = { dailyDemand: 1000, restrictionDays: 90, lossPerM3: 10, backupShare: 0.4, backupPremium: 3, responseCost: 2000, protectedShare: 0 };

describe("commercial drought exposure", () => {
  it("separates lost contribution, incremental backup and response without double counting", () => {
    expect(droughtEventCost(inputs, 0.25)).toEqual({ affectedVolume: 22500, backupVolume: 9000, unmetVolume: 13500, disruption: 135000, mitigation: 27000, response: 2000, total: 164000 });
  });
  it("replays the documented 15% industrial reduction with the user's inputs", () => {
    expect(droughtEventCost(inputs, 0.15).total).toBe(99200);
  });
  it("uses the documented 25% emergency reduction, not a 25% production loss", () => {
    expect(droughtEventCost({ ...inputs, backupShare: 1 }, 0.25).disruption).toBe(0);
  });
  it("reduces exposed demand only for assumed independently available supply", () => {
    expect(droughtEventCost({ ...inputs, protectedShare: 0.5 }, 0.25).total).toBe(83000);
    expect(droughtEventCost({ ...inputs, protectedShare: 1 }, 0.25).total).toBe(0);
  });
  it("caps assumed duration at 365 days and starts the outlook in 2026", () => {
    expect(restrictionDaysAt(300, 0.05, 15)).toBe(365);
    const rows = droughtCostOutlook(inputs);
    expect(rows).toHaveLength(16);
    expect(rows[0]).toEqual({ year: 2026, contained: 99200, prolonged: 164000, persistent: 164000 });
    expect(rows[15]?.persistent).toBeCloseTo(162000 * 1.05 ** 15 + 2000);
  });
  it("rejects invalid exposure rather than showing misleading costs", () => {
    expect(() => droughtEventCost({ ...inputs, backupShare: 1.1 }, 0.25)).toThrow(RangeError);
    expect(() => droughtEventCost(inputs, -0.1)).toThrow(RangeError);
    expect(() => droughtEventCost({ ...inputs, dailyDemand: NaN }, 0.25)).toThrow(RangeError);
    expect(() => droughtEventCost(inputs, 0.25, 366)).toThrow(RangeError);
  });
});

describe("reuse investment resilience screening", () => {
  const project = { additionalProtectedShare: 0.5, capitalCost: 250000, annualOperatingCost: 15000, eventsPerYear: 0.5, years: 10 };
  it("compares the same 25% restriction with and without additional reuse", () => {
    const result = reuseInvestmentCase(inputs, 0.25, 90, project);
    expect(result.baseline.total).toBe(164000);
    expect(result.withReuse.total).toBe(83000);
    expect(result.avoidedPerEvent).toBe(81000);
    expect(result.protectedVolume).toBe(11250);
  });
  it("deducts operating and capital costs from explicit event-frequency benefits", () => {
    const result = reuseInvestmentCase(inputs, 0.25, 90, project);
    expect(result.annualNet).toBe(25500);
    expect(result.netOverPeriod).toBe(5000);
    expect(result.simplePayback).toBeCloseTo(250000 / 25500);
  });
  it("does not claim payback when no events occur", () => {
    const result = reuseInvestmentCase(inputs, 0.25, 90, { ...project, eventsPerYear: 0 });
    expect(result.simplePayback).toBeNull();
    expect(result.netOverPeriod).toBe(-400000);
  });
  it("caps combined protected supply at 100%", () => {
    const result = reuseInvestmentCase({ ...inputs, protectedShare: 0.8 }, 0.25, 90, project);
    expect(result.protectedShare).toBe(1);
    expect(result.withReuse.total).toBe(0);
    expect(result.avoidedPerEvent).toBeCloseTo(34400);
  });
  it("rejects invalid investment assumptions", () => {
    expect(() => reuseInvestmentCase(inputs, 0.25, 90, { ...project, years: 0 })).toThrow(RangeError);
    expect(() => reuseInvestmentCase(inputs, 0.25, 90, { ...project, additionalProtectedShare: 1.1 })).toThrow(RangeError);
  });
});