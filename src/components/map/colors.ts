import type { TreatmentLevel } from "@/lib/types";

// Data-viz colours used by deck.gl (needs RGB arrays) and by the legends.
export const LEVEL_COLORS: Record<TreatmentLevel, [number, number, number]> = {
  primary: [170, 170, 170],
  secondary: [120, 175, 200],
  tertiary: [11, 110, 138],
};
export const REGEN_COLOR: [number, number, number] = [16, 160, 120];

export function fillColor(pct: number): [number, number, number] {
  if (pct < 30) return [205, 60, 50];
  if (pct < 60) return [225, 165, 40];
  return [60, 160, 90];
}

// German rivers coloured by the nearest gauge: orange-brown = low water, river blue = normal, navy = high.
// Normal matches the basemap's rivers so low water stands out; orange/blue stays distinguishable for
// red-green colour blindness, unlike the reservoir red/amber/green.
export const RIVER_COLORS = { low: [204, 102, 0], normal: [110, 180, 228], high: [20, 45, 120] } as const satisfies Record<string, [number, number, number]>;
// Gauges carry fill 15/55/90 (see pegel.ts), so the reservoir thresholds pick the state.
export const riverColor = (fill: number): [number, number, number] =>
  fill < 30 ? RIVER_COLORS.low : fill < 60 ? RIVER_COLORS.normal : RIVER_COLORS.high;

export const rgb = (c: [number, number, number]) => `rgb(${c.join(",")})`;
