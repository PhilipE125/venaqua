import { describe, expect, it } from "vitest";
import { predictPipes } from "./pipes";

describe("predictPipes", () => {
  it("links a small plant to nearby sites only and marks it rural", () => {
    const plants = [{ id: "p", lon: 1, lat: 41, capacity: 800 }];
    const sites = [{ id: "a", lon: 1.05, lat: 41 }, { id: "far", lon: 2, lat: 41 }];
    const segs = predictPipes(plants, sites);
    expect(segs).toHaveLength(1);
    expect(segs[0].rural).toBe(true);
  });
});
