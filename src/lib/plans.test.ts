import { describe, expect, it } from "vitest";
import { hasApiAccess, planLimit } from "./plans";

describe("plan limits", () => {
  it("Deal Flow Pro allows 10 active opportunities", () => expect(planLimit("market_access")).toBe(10));
  it("Deal Flow Team allows 25 active opportunities", () => expect(planLimit("portfolio")).toBe(25));
  it("only Data & API includes API access", () => {
    expect(hasApiAccess("data_api")).toBe(true);
    expect(hasApiAccess("portfolio")).toBe(false);
  });
});
