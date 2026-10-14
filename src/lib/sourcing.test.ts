import { describe, expect, it } from "vitest";
import { evaluateOptions, optionB, optionC, type CostInputs } from "./costs";
import { droughtWindow, historicFrequencies, phaseFrequencies } from "./projection";
import { DEFAULT_SETTINGS } from "./state";

const inputs = (m3Day: number): CostInputs => ({ demandM3PerYear: m3Day * 365, tariff: 2, dischargeCharge: 1, rate: 0.06, years: 20, electricity: [0.15, 0.15] });
const onsite = { recoveryRate: [0.6, 0.6] as [number, number], capexPerM3Day: [1500, 1500] as [number, number], opex: [0.8, 0.8] as [number, number], scaleExponent: 0.7 };

describe("on-site economies of scale", () => {
  it("costs more per m³ at 5 m³/day than at 50 or 500 m³/day", () => {
    const at = (q: number) => optionC(inputs(q), onsite).perM3[0];
    expect(at(5)).toBeGreaterThan(at(50));
    expect(at(50)).toBeGreaterThan(at(500));
  });
  it("leaves the flat model unchanged when the exponent is 1", () => {
    const flat = optionC(inputs(50), { ...onsite, scaleExponent: 1 });
    const none = optionC(inputs(50), { recoveryRate: onsite.recoveryRate, capexPerM3Day: onsite.capexPerM3Day, opex: onsite.opex });
    expect(flat.annualCost).toEqual(none.annualCost);
  });
});

describe("capex grants", () => {
  it("change nothing at the default of 0", () => {
    const base = { q: 100_000, tariff: 2, dischargeCharge: 0.8, rate: 0.06, years: 20, electricity: 0.15, plant: { distanceKm: 5, liftM: 10, reuseReady: true, availableM3PerDay: 1000 }, effluentK: 1, cut: 0, events: undefined };
    const a = evaluateOptions({ ...base, s: { ...DEFAULT_SETTINGS, capexGrantShare: 0 } });
    const b = evaluateOptions({ ...base, s: { ...DEFAULT_SETTINGS, capexGrantShare: undefined as unknown as number } });
    expect(a.B!.capex).toEqual(b.B!.capex);
    expect(a.C.capex).toEqual(b.C.capex);
  });
  it("reduce B and C capex by the share", () => {
    const g = { distanceKm: 2, liftM: 0, pumpEfficiency: 0.7, pipeCostPerKm: [100_000, 200_000] as [number, number], polishing: [0, 0] as [number, number], reclaimedPrice: [0.5, 0.5] as [number, number], availableM3PerDay: 1000 };
    expect(optionB(inputs(100), { ...g, grantShare: 0.3 }).capex[0]).toBeCloseTo(optionB(inputs(100), g).capex[0] * 0.7);
    expect(optionC(inputs(100), { ...onsite, grantShare: 0.3 }).capex[0]).toBeCloseTo(optionC(inputs(100), onsite).capex[0] * 0.7);
  });
});

describe("drought history window", () => {
  const log = [
    { date: "2021-01-01", phase: "normal" as const },
    { date: "2022-01-01", phase: "alert" as const },
    { date: "2024-01-01", phase: "emergency" as const },
    { date: "2025-01-01", phase: "normal" as const },
  ];
  it("covers only the years the log spans", () => {
    expect(droughtWindow(log)).toEqual([2021, 2025]);
  });
  it("does not count years before the log as normal", () => {
    const real = historicFrequencies(log);
    const padded = phaseFrequencies(log, 2008, 2025);
    expect(real.normal).toBeLessThan(padded.normal);
    expect(real.alert).toBeCloseTo(2 / 5, 2);
    expect(real.emergency).toBeCloseTo(1 / 5, 2);
  });
});
