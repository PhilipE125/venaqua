import { describe, expect, it } from "vitest";
import { convexHull, findClusters } from "./clusters";
import { cumulative, expectedCut, paybackYear, tariffAt } from "./projection";
import { climateFactor } from "./sources/aqueduct";

describe("findClusters", () => {
  const plant = { id: "p", lat: 41.5, lon: 2.0, available: 1000 };
  const east = [0.02, 0.03, 0.04].map((d, i) => ({ id: `e${i}`, lat: 41.5 + d / 10, lon: 2.0 + d, demand: 100 }));
  const west = [{ id: "w0", lat: 41.5, lon: 1.97, demand: 100 }];
  const opts = { maxKm: 10, pipeCostPerKm: [100_000, 200_000] as [number, number], rate: 0.06, years: 20 };
  it("groups companies in the same direction", () => {
    const c = findClusters([plant], [...east, ...west], opts);
    expect(c).toHaveLength(1);
    expect(c[0]!.companyIds.sort()).toEqual(["e0", "e1", "e2"]);
    expect(c[0]!.delivered).toBe(300);
    expect(c[0]!.capex[1]).toBeGreaterThan(c[0]!.capex[0]);
  });
  it("needs at least three companies", () => {
    expect(findClusters([plant], east.slice(0, 2), opts)).toHaveLength(0);
  });
  it("hull of a square has four corners", () => {
    expect(convexHull([[0, 0], [1, 0], [1, 1], [0, 1], [0.5, 0.5]])).toHaveLength(4);
  });
});

describe("projection", () => {
  it("compounds tariffs", () => {
    expect(tariffAt(2, 0.03, 10)).toBeCloseTo(2.688, 3);
  });
  it("scales non-normal phases by the climate factor", () => {
    const freq = { normal: 0.5, "pre-alert": 0, alert: 0.5, exceptional: 0, emergency: 0 };
    const cuts = { normal: 0, "pre-alert": 0, alert: 0.1, exceptional: 0, emergency: 0 };
    expect(expectedCut(freq, cuts, 1.2)).toBeCloseTo(0.06);
    expect(climateFactor(2040)).toBeCloseTo(1.2);
  });
  it("finds the payback year", () => {
    const rows = cumulative(
      { A: { capex: 0, opex: (t) => 100 * t }, C: { capex: 500, opex: () => 50 } },
      [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035, 2036],
      () => 1,
      () => 0,
    );
    expect(paybackYear(rows, "C")).toBe(2035);
  });
});
