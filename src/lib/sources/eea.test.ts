import { describe, expect, it } from "vitest";
import { nationalPlant, parseReusePercent, type EeaPlant } from "./eea";

const plant: EeaPlant = { code: "ES1", name: "Test plant", capacity: 10000, treatedM3PerYear: 365000, lat: 40, lon: -3, nuts: "ES30", uv: false, filtration: false, ozonation: false, nRemoval: true, pRemoval: true };
describe("Spain EEA normalization", () => {
  it("divides measured annual volume by 365", () => { expect(nationalPlant(plant)?.supply?.actualFlow).toBe(1000); expect(nationalPlant(plant)?.supply?.actualQuality).toBe("measured"); });
  it("uses 0.13 m³/day per population equivalent if treated volume is missing", () => { const p = nationalPlant({ ...plant, treatedM3PerYear: null }); expect(p?.supply?.actualFlow).toBeCloseTo(1300); expect(p?.supply?.actualQuality).toBe("assumption"); });
  it("flags more than 1 m³ per population equivalent per day and offers none of it", () => { const p = nationalPlant({ ...plant, treatedM3PerYear: plant.capacity * 2 * 365 }); expect(p?.supply?.suspect).toBeTruthy(); expect(p?.supply?.availableReclaimed).toBe(0); });
  it("parses comma-decimal reuse percentages", () => { expect(parseReusePercent("59,91")).toBe(59.91); });
  it("does not turn missing reuse into reported zero", () => { expect(nationalPlant(plant)?.reuseReported).toBeNull(); expect(parseReusePercent(null)).toBeNull(); });
  it("subtracts reported reuse from treated supply", () => { expect(nationalPlant({ ...plant, reusePct: 25 })?.supply?.availableReclaimed).toBe(750); });
  it("requires nitrogen and phosphorus removal plus polishing for advanced readiness", () => { expect(nationalPlant({ ...plant, uv: true })?.supply?.reuseReady).toBe(true); expect(nationalPlant({ ...plant, uv: true, pRemoval: false })?.supply?.reuseReady).toBe(false); });
});