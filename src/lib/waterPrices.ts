/** Sensitivity assumptions, not an econometric forecast or a map-to-price conversion. */
export const PRICE_SCENARIOS = [
  { id: "managed", label: "Managed stress", rate: 0.02, color: "var(--chart-1)" },
  { id: "rising", label: "Rising stress", rate: 0.05, color: "var(--chart-3)" },
  { id: "severe", label: "Severe stress", rate: 0.08, color: "var(--chart-4)" },
] as const;

export function priceAt(base: number, annualRate: number, years: number): number {
  if (!Number.isFinite(base) || base < 0 || !Number.isFinite(annualRate) || annualRate <= -1 || !Number.isInteger(years) || years < 0) {
    throw new RangeError("Use a non-negative price, a rate above -100%, and whole non-negative years.");
  }
  return base * (1 + annualRate) ** years;
}

export function projectWaterPrices(base: number, baseYear: number, horizon: number) {
  return Array.from({ length: horizon + 1 }, (_, ahead) => ({
    year: baseYear + ahead,
    managed: priceAt(base, PRICE_SCENARIOS[0].rate, ahead),
    rising: priceAt(base, PRICE_SCENARIOS[1].rate, ahead),
    severe: priceAt(base, PRICE_SCENARIOS[2].rate, ahead),
  }));
}