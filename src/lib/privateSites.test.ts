import { describe, expect, it } from "vitest";
import { parseSitesCsv } from "./privateSites";

describe("parseSitesCsv", () => {
  it("parses valid rows", () => {
    const r = parseSitesCsv("name,kind,lat,lon,volume_m3_day\n\"Plant, A\",demand,41.4,2.1,500");
    expect(r.rows).toEqual([{ name: "Plant, A", kind: "demand", lat: 41.4, lon: 2.1, volume_m3_day: 500, notes: "" }]);
  });
  it("rejects bad kind and coordinates", () => {
    const r = parseSitesCsv("name,kind,lat,lon\nA,other,1,1\nB,supply,200,1");
    expect(r.rows).toHaveLength(0);
    expect(r.errors).toHaveLength(2);
  });
  it("reports missing columns", () => {
    expect(parseSitesCsv("name,lat\nA,1").errors[0]).toContain("kind");
  });
});
