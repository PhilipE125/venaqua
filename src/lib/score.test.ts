import { describe, expect, it } from "vitest";
import { businessCase, effectiveSupply, haversineKm, rawScore, scorePairs } from "./score";

describe("haversineKm", () => {
  it("is zero for identical points", () => {
    expect(haversineKm({ lat: 41.4, lon: 2.1 }, { lat: 41.4, lon: 2.1 })).toBe(0);
  });
  it("Barcelona to Girona is about 85 km", () => {
    const d = haversineKm({ lat: 41.3874, lon: 2.1686 }, { lat: 41.9794, lon: 2.8214 });
    expect(d).toBeGreaterThan(80);
    expect(d).toBeLessThan(90);
  });
});

describe("rawScore", () => {
  it("follows min(supply,demand)*(1+stress)/(1+d)", () => {
    expect(rawScore({ supply: 1000, demand: 200, stress: 0.5, distanceKm: 2 })).toBeCloseTo((200 * 1.5) / 3);
  });
  it("clamps stress to 0..1", () => {
    expect(rawScore({ supply: 10, demand: 10, stress: 4, distanceKm: 0 })).toBe(20);
  });
});

describe("effectiveSupply", () => {
  it("doubles reuse-ready capacity", () => {
    expect(effectiveSupply(100, true)).toBe(200);
    expect(effectiveSupply(100, false)).toBe(100);
  });
});

describe("scorePairs", () => {
  const sites = [{ id: "s", lat: 41.4, lon: 2.1, supply: 1000 }];
  const companies = [
    { id: "near", lat: 41.401, lon: 2.1, demand: 100 },
    { id: "far", lat: 41.6, lon: 2.1, demand: 100 },
  ];
  it("filters by max distance and normalises to 100", () => {
    const m = scorePairs(sites, companies, { maxKm: 5, stress: 0 });
    expect(m).toHaveLength(1);
    expect(m[0]?.companyId).toBe("near");
    expect(m[0]?.score).toBe(100);
  });
});

describe("businessCase", () => {
  it("computes savings and payback", () => {
    const b = businessCase({ distanceKm: 2, matchedM3PerDay: 100, pipeCostPerKm: 1000, tariff: 1.92, reclaimedPrice: 0.92 });
    expect(b.pipeCost).toBe(2000);
    expect(b.annualSavings).toBeCloseTo(36500);
    expect(b.paybackYears).toBeCloseTo(2000 / 36500);
  });
});
