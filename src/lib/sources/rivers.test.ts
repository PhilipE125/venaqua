import { describe, expect, it } from "vitest";
import { flowState, utm31ToLonLat } from "./rivers";

describe("rivers", () => {
  it("converts ETRS89 UTM 31N to lon/lat (Barcelona)", () => {
    const [lon, lat] = utm31ToLonLat(430000, 4581000);
    expect(lon).toBeCloseTo(2.16, 1);
    expect(lat).toBeCloseTo(41.38, 1);
  });
  it("classifies flow against the station median", () => {
    expect(flowState(0.4, 1)).toBe("low");
    expect(flowState(1, 1)).toBe("normal");
    expect(flowState(2.5, 1)).toBe("high");
    expect(flowState(0, 0)).toBe("low");
  });
});
