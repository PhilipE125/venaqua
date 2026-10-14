import { describe, expect, it } from "vitest";
import { defaultEffluent } from "./costs";
import { evaluateCompany } from "./companyEval";
import { flipRowFor, sortFlipRows, type FlipRow } from "./flipRows";
import { GROWTH, historicFrequencies, projectFuture } from "./projection";
import { DEFAULT_SETTINGS } from "./state";
import type { Company } from "./types";

const company = {
  id: "co-1",
  name: "Test Works",
  lat: 41.5,
  lon: 2.0,
  kind: "company",
  municipi: "Abrera",
  ccae: "10.89",
  activity: "Food preparation",
  sector: "food",
  tipus: "",
  subtipus: "",
  sources: ["eea"],
} as Company;

const plant = { name: "Sant Joanari", straightKm: 2, reuseReady: true, availableM3PerDay: 5000 };
const freq = historicFrequencies(undefined);
const inputs = { company, q: 365_000, tariff: 2, dischargeCharge: 1, plant, events: undefined, freq, settings: DEFAULT_SETTINGS };

describe("flipRowFor", () => {
  const row = flipRowFor(inputs)!;

  it("shows the year an own on-site plant pays back, not the connect year", () => {
    const f = projectFuture(
      evaluateCompany({
        q: inputs.q,
        tariff: inputs.tariff,
        dischargeCharge: inputs.dischargeCharge,
        rate: DEFAULT_SETTINGS.rate,
        years: DEFAULT_SETTINGS.years,
        electricity: DEFAULT_SETTINGS.electricity.base,
        effluent: defaultEffluent(company.sector),
        plant: { straightKm: plant.straightKm, reuseReady: plant.reuseReady, availableM3PerDay: plant.availableM3PerDay },
        cut: 0,
        events: undefined,
        settings: DEFAULT_SETTINGS,
      }).future,
      GROWTH.mid,
      freq,
    );
    expect(row.ownFlipYear).toBe(f.payC);
    // Connecting pays back sooner for this site, so the shown year must not be the connect year.
    expect(f.payB).not.toBeNull();
    expect(f.payB!).toBeLessThan(f.payC!);
    expect(row.ownFlipYear).not.toBe(f.payB);
    expect(row.flipYear).toBe(f.payB);
  });

  it("skips a company with no demand", () => {
    expect(flipRowFor({ ...inputs, q: 0 })).toBeNull();
  });
});

describe("sortFlipRows", () => {
  const base = flipRowFor(inputs)!;
  const at = (id: string, ownFlipYear: number | null, perM3: number, statusQuo: number): FlipRow => ({
    ...base,
    company: { ...base.company, id, name: id },
    ownFlipYear,
    perM3,
    statusQuo,
  });

  it("puts the soonest own-plant payback first and sites that never pay back last", () => {
    const sorted = sortFlipRows([at("late", 2040, 2, 3), at("never", null, 2, 3), at("soon", 2030, 2, 3)]);
    expect(sorted.map((r) => r.company.id)).toEqual(["soon", "late", "never"]);
  });

  it("breaks ties on how close reuse is to the status quo", () => {
    const sorted = sortFlipRows([at("dear", 2030, 4, 3), at("cheap", 2030, 2, 3)]);
    expect(sorted.map((r) => r.company.id)).toEqual(["cheap", "dear"]);
  });
});
