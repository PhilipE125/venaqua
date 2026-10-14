import { describe, expect, it } from "vitest";
import { crf, droughtLoss, opportunityCost, optionA, optionB, optionC, pumpingKWhPerM3, supplyCostPerM3, type CostInputs } from "./costs";
import { eeaJoinKey } from "./sources/eea";
import { sectorFromCcae, sectorFromIedActivity } from "./sectors";
import { phaseDaysInYear, phaseFromCode } from "./sources/drought";

const base: CostInputs = { demandM3PerYear: 100_000, tariff: 2, dischargeCharge: 1, rate: 0.06, years: 20, electricity: [0.15, 0.15] };

describe("crf", () => {
  it("matches the textbook value for 6% over 20 years", () => {
    expect(crf(0.06, 20)).toBeCloseTo(0.08718, 4);
  });
  it("is 1/n at zero rate", () => {
    expect(crf(0, 10)).toBeCloseTo(0.1);
  });
});

describe("option A", () => {
  it("is demand × (tariff + discharge)", () => {
    expect(optionA(base).annualCost).toEqual([300_000, 300_000]);
    expect(optionA(base).perM3[0]).toBeCloseTo(3);
  });
});

describe("option B", () => {
  const g = { distanceKm: 2, liftM: 10, pumpEfficiency: 0.7, pipeCostPerKm: [100_000, 200_000] as [number, number], polishing: [0, 0] as [number, number], reclaimedPrice: [0.5, 0.5] as [number, number], availableM3PerDay: 1000 };
  it("covers all demand when supply is ample", () => {
    const b = optionB(base, g);
    expect(b.coverage).toBe(1);
    const kwh = pumpingKWhPerM3(10, 0.7);
    const expectedLo = 200_000 * crf(0.06, 20) + 100_000 * (0.5 + kwh * 0.15) + 100_000 * 1;
    expect(b.annualCost[0]).toBeCloseTo(expectedLo, 0);
    expect(b.annualCost[1]).toBeGreaterThan(b.annualCost[0]);
  });
  it("buys the shortfall at tariff when supply is limited", () => {
    const b = optionB(base, { ...g, availableM3PerDay: 100 });
    expect(b.deliverable).toBe(36_500);
    expect(b.coverage).toBeCloseTo(0.365);
  });
});

describe("option C", () => {
  it("saves both purchase and discharge on the recycled share", () => {
    const c = optionC(base, { recoveryRate: [0.5, 0.5], capexPerM3Day: [0, 0], opex: [1, 1] });
    // 50k recycled at 1 €/m3 + 50k at 3 €/m3
    expect(c.annualCost[0]).toBeCloseTo(200_000);
  });
});

describe("opportunity cost and drought", () => {
  it("is A minus the cheaper alternative plus drought loss avoided", () => {
    expect(opportunityCost([300, 300], [200, 250], [260, 280], 50, 10)).toEqual([90, 140]);
  });
  it("drought loss shrinks with protected share", () => {
    expect(droughtLoss(1000, 0.25, 5)).toBe(1250);
    expect(droughtLoss(1000, 0.25, 5, 0.5)).toBe(625);
  });
  it("counts days per phase in a year", () => {
    const d = phaseDaysInYear([{ date: "2022-12-01", phase: "alert" }, { date: "2023-07-02", phase: "emergency" }], 2023);
    expect(d.alert).toBe(182);
    expect(d.emergency).toBe(183);
    expect(phaseFromCode("00007")).toBe("exceptional");
    expect(phaseFromCode("00009")).toBe("emergency");
    expect(phaseFromCode("00120")).toBe("exceptional");
  });
});

describe("EEA join key", () => {
  it("drops the 0 after ES and appends E", () => {
    expect(eeaJoinKey("ES09080010001010")).toBe("ES9080010001010E");
    expect(eeaJoinKey("")).toBeNull();
  });
});

describe("IED activity → sector", () => {
  it("maps Annex I codes", () => {
    expect(sectorFromIedActivity("1(c)")).toBe("energy");
    expect(sectorFromIedActivity("2(b)")).toBe("metals");
    expect(sectorFromIedActivity("3(c)(i)")).toBe("minerals");
    expect(sectorFromIedActivity("4(a)(ii)")).toBe("chemicals");
    expect(sectorFromIedActivity("6(a)")).toBe("paper");
    expect(sectorFromIedActivity("7(a)(i)")).toBeNull();
    expect(sectorFromIedActivity("")).toBeNull();
    expect(sectorFromIedActivity("9(a)")).toBe("textiles");
    expect(sectorFromIedActivity("8(b)(ii)")).toBe("food");
  });
  it("excludes waste and wastewater activities", () => {
    expect(sectorFromIedActivity("5(f)")).toBeNull();
    expect(sectorFromIedActivity("5(d)")).toBeNull();
  });
});

describe("supplyCostPerM3", () => {
  const s = { detourFactor: 1.3, pipeCostPerKm: [150_000, 400_000] as [number, number], polishing: [0.25, 0.6] as [number, number], rate: 0.06, years: 20 };
  it("prefers a near plant that needs polishing over a far reuse-ready one", () => {
    const near = supplyCostPerM3({ distanceKm: 2, reuseReady: false, availableM3PerDay: 5000 }, 91_250, s);
    const far = supplyCostPerM3({ distanceKm: 15, reuseReady: true, availableM3PerDay: 5000 }, 91_250, s);
    expect(near).toBeLessThan(far);
  });
  it("cannot supply from a plant with nothing available", () => {
    expect(supplyCostPerM3({ distanceKm: 1, reuseReady: true, availableM3PerDay: 0 }, 1000, s)).toBe(Infinity);
  });
});

describe("sectorFromCcae", () => {
  it("matches keywords at word starts only", () => {
    expect(sectorFromCcae("Extracció de caolí")).not.toBe("food");
    expect(sectorFromCcae("Explotació de cavalls")).not.toBe("food");
    expect(sectorFromCcae("Elaboració de cava")).toBe("food");
    expect(sectorFromCcae("Fabricació de matèries plàstiques")).toBe("plastics");
    expect(sectorFromCcae("Reparació de vehicles de motor")).toBe("services");
  });
});
