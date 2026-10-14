import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchRoadRoute } from "./sources/route";

afterEach(() => vi.unstubAllGlobals());

describe("fetchRoadRoute", () => {
  it("returns road km and joins the snapped route back to both points", async () => {
    const body = { code: "Ok", routes: [{ distance: 2500, geometry: { coordinates: [[2.101, 41.321], [2.149, 41.349]] } }] };
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body))));
    const r = await fetchRoadRoute({ lat: 41.32, lon: 2.1 }, { lat: 41.35, lon: 2.15 });
    expect(r?.km).toBe(2.5);
    expect(r?.path[0]).toEqual([2.1, 41.32]);
    expect(r?.path.at(-1)).toEqual([2.15, 41.35]);
  });
  it("is null when there is no road link", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ code: "NoRoute" }))));
    expect(await fetchRoadRoute({ lat: 39.6, lon: 2.6 }, { lat: 41.4, lon: 2.2 })).toBeNull();
  });
});
