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

export const rgb = (c: [number, number, number]) => `rgb(${c.join(",")})`;
