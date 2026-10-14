import { describe, expect, it } from "vitest";
import { PRICE_SCENARIOS, priceAt, projectWaterPrices } from "./waterPrices";

describe("freshwater price sensitivity", () => {
  it("starts every stress scenario at the same entered commercial price", () => {
    const first = projectWaterPrices(2.5, 2026, 15)[0];
    expect(first).toEqual({ year: 2026, managed: 2.5, rising: 2.5, severe: 2.5 });
  });
  it("compounds the declared annual rate over the requested horizon", () => {
    expect(priceAt(2, 0.05, 2)).toBeCloseTo(2.205, 8);
    const rows = projectWaterPrices(2, 2026, 15);
    expect(rows).toHaveLength(16);
    expect(rows[15]?.year).toBe(2041);
    expect(rows[15]?.severe).toBeCloseTo(2 * 1.08 ** 15, 8);
    expect(PRICE_SCENARIOS.map((s) => s.rate)).toEqual([0.02, 0.05, 0.08]);
  });
  it("rejects invalid inputs rather than producing misleading prices", () => {
    expect(() => priceAt(-1, 0.05, 2)).toThrow(RangeError);
    expect(() => priceAt(2, 0.05, -1)).toThrow(RangeError);
    expect(() => priceAt(NaN, 0.05, 2)).toThrow(RangeError);
  });
});