import { describe, expect, it } from "vitest";
import { STRESS_HORIZONS, stressAt } from "./stressGrid";

describe("stress horizons", () => {
  it("includes a present-day surface and all requested future horizons", () => {
    expect(STRESS_HORIZONS.map((h) => h.ahead)).toEqual([0, 2, 5, 10, 15]);
    expect(STRESS_HORIZONS[0].year).toBe("2026");
  });
  it("keeps current and future illustrative stress bounded", () => {
    const now = stressAt(-3.7, 40.4, 0);
    expect(now).toBeGreaterThan(0);
    expect(now).toBeLessThan(100);
    expect(stressAt(-3.7, 40.4, 15)).toBeGreaterThan(now);
    expect(stressAt(-1.3, 37.9, 15)).toBeLessThanOrEqual(100);
  });
});