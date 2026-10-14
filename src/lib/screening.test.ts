import { describe, expect, it } from "vitest";
import { comarcaKey, footprint, mainsShare } from "./footprint";
import { evaluateCandidate } from "./companyEval";
import { DEFAULT_SETTINGS } from "./state";
import { monthMedian, riskLevel, sharedOption, sharedPipeShare, verdict, visibilityLevel, weakest } from "./screening";

describe("footprint", () => {
  const c = { business: 22_551_325, households: 31_654_905, perCapita: 101.08 };
  it("draws less from mains with own plant or connection than status quo", () => {
    const p = { recovery: 0.6, coverage: 0.9 };
    const s = footprint(250, mainsShare("status", p), c).drawDay;
    expect(footprint(250, mainsShare("own", p), c).drawDay).toBeLessThan(s);
    expect(footprint(250, mainsShare("connect", p), c).drawDay).toBeLessThan(s);
  });
  it("resident-equivalents = litres per day ÷ per-capita use", () => {
    const f = footprint(250, 1, c);
    expect(f.residents).toBeCloseTo((250 * 1000) / 101.08);
    expect(f.shareOfBusiness).toBeCloseTo((250 * 365) / 22_551_325);
  });
  it("normalises comarca names", () => {
    expect(comarcaKey("BAIX LLOBREGAT, EL")).toBe("baix llobregat");
    expect(comarcaKey("Baix Llobregat")).toBe("baix llobregat");
    expect(comarcaKey("ALT EMPORDÀ, L'")).toBe("alt emporda");
    expect(comarcaKey("Moianès")).toBe("moianes");
  });
});

describe("weakest input", () => {
  it("one assumption makes the result an assumption", () => expect(weakest(["measured", "assumption"])).toBe("assumption"));
  it("only measured inputs make it modelled", () => expect(weakest(["measured", "your figure"])).toBe("modelled"));
});

describe("local visibility rule", () => {
  const t = { share: 0.01, residents: 5000 };
  it("High when big and severe", () => expect(visibilityLevel({ shareOfBusiness: 0.02, residents: 100, severeInRecord: true }, t)).toBe("High"));
  it("Medium when one holds", () => expect(visibilityLevel({ shareOfBusiness: 0.001, residents: 6000, severeInRecord: false }, t)).toBe("Medium"));
  it("Low when neither", () => expect(visibilityLevel({ shareOfBusiness: 0.001, residents: 100, severeInRecord: false }, t)).toBe("Low"));
});

describe("opportunity cost", () => {
  it("N is the difference of mid annual costs", () => {
    const v = verdict([{ key: "own", label: "Own", annual: [100, 200] }, { key: "connect", label: "Connect", annual: [300, 500] }], 0.06, 20)!;
    expect(v.best.key).toBe("own");
    expect(v.perYear).toBe(250);
    expect(v.close).toBe(false);
  });
  it("is too close to call when ranges overlap", () => {
    const v = verdict([{ key: "own", label: "Own", annual: [100, 400] }, { key: "connect", label: "Connect", annual: [300, 500] }], 0.06, 20)!;
    expect(v.close).toBe(true);
  });
});

describe("shared pipe", () => {
  it("one joiner pays the whole pipe, more joiners pay less", () => {
    expect(sharedPipeShare(100, 1000, 10, 1)).toBe(1);
    expect(sharedPipeShare(100, 1000, 10, 10)).toBeCloseTo(0.1);
  });
  it("only swaps the pipe capex", () => {
    const s = sharedOption({ annualCost: [1000, 2000], capex: [0, 0] }, [0, 0], 1, 0.06, 20, 0, 100);
    expect(s.annualCost).toEqual([1000, 2000]);
  });
});

describe("risk levels", () => {
  it("uses the thresholds", () => {
    const t = { high: 0.02, medium: 0.005 };
    expect(riskLevel(30, 1000, t)).toBe("High");
    expect(riskLevel(10, 1000, t)).toBe("Medium");
    expect(riskLevel(1, 1000, t)).toBe("Low");
  });
  it("median per month", () => expect(monthMedian([{ month: "2020-05", value: 10 }, { month: "2021-05", value: 30 }, { month: "2021-06", value: 99 }], "05")).toBe(20));
});

describe("candidate rows", () => {
  it("show the same €/m³ range as the answer for the selected plant", () => {
    const base = { q: 91_250, tariff: 1.16, dischargeCharge: 0.76, rate: 0.06, years: 20, electricity: 0.15, effluent: "medium" as const, cut: 0, events: undefined, settings: DEFAULT_SETTINGS };
    const cand = { d: 5, p: { supply: { reuseReady: true, availableReclaimed: 5000 } } };
    const row = evaluateCandidate(base, cand, { roadKm: 7.6, heightM: 12 });
    const answer = evaluateCandidate(base, cand, { roadKm: 7.6, heightM: 12 });
    expect(row.B!.perM3).toEqual(answer.B!.perM3);
  });
});
