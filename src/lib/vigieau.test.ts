import { afterEach, describe, expect, it, vi } from "vitest";
import { departmentStress, fetchRestriction } from "./sources/vigieau";

afterEach(() => vi.unstubAllGlobals());

describe("fetchRestriction", () => {
  it("takes the most severe zone and maps it to a drought phase", async () => {
    const zones = [
      { nom: "Nappe", niveauGravite: "alerte" },
      { nom: "Rivière", niveauGravite: "crise" },
      { nom: "AEP", niveauGravite: "vigilance" },
    ];
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(zones))));
    const r = await fetchRestriction(45.76, 4.83);
    expect(r.level).toBe("crise");
    expect(r.zone).toBe("Rivière");
    expect(r.phase).toBe("emergency");
  });
  it("is normal when no zone has a restriction", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("[]")));
    const r = await fetchRestriction(46, -6);
    expect(r.level).toBeNull();
    expect(r.phase).toBe("normal");
  });
});

describe("departmentStress", () => {
  it("averages levels from none (0) to crise (1)", () => {
    expect(departmentStress([{ code: "1", name: "a", level: "crise" }, { code: "2", name: "b", level: null }])).toBe(0.5);
    expect(departmentStress([])).toBeNull();
  });
});
