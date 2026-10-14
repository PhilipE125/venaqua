/** INE table 01003, national water-supply component (not total supply + sanitation).
 * Verified against the publisher's CSV on 14 October 2026. No missing years are invented.
 */
export const WATER_PRICE_HISTORY = [
  { year: 2010, historical: 0.92 },
  { year: 2011, historical: 0.95 },
  { year: 2012, historical: 1.03 },
  { year: 2013, historical: 1.09 },
  { year: 2014, historical: 1.10 },
  { year: 2016, historical: 1.17 },
  { year: 2018, historical: 1.13 },
  { year: 2020, historical: 1.14 },
  { year: 2022, historical: 1.16 },
] as const;
export const WATER_PRICE_BASE_YEAR = 2026;
export const WATER_PRICE_HISTORY_LAST_YEAR = 2022;
export const WATER_PRICE_BENCHMARK = 1.16;