import { muniKey } from "../sectors";
import { socrata } from "./socrata";

export const DROUGHT_ID = "i5n8-43cw";

export type Phase = "normal" | "pre-alert" | "alert" | "exceptional" | "emergency";
export const PHASES: Phase[] = ["normal", "pre-alert", "alert", "exceptional", "emergency"];

export function phaseFromCode(code: string): Phase {
  const n = parseInt(code, 10);
  if (!Number.isFinite(n) || n <= 4) return "normal";
  if (n === 5) return "pre-alert";
  if (n === 6) return "alert";
  if (n === 7) return "exceptional";
  // 120 is "preemergència", added in the 2023-24 drought between exceptional and emergency.
  if (n === 120) return "exceptional";
  return "emergency";
}

export interface DroughtEvent {
  date: string;
  phase: Phase;
}

export interface DroughtData {
  byMuni: Map<string, DroughtEvent[]>; // sorted ascending
  fetchedAt: string;
  latestDataDate: string;
}

export async function fetchDrought(): Promise<DroughtData> {
  const rows = await socrata<{ municipi: string; data_canvi_estat_sequera: string; codi_estat_sequera_hidrol: string }>(
    DROUGHT_ID,
    { $select: "municipi,data_canvi_estat_sequera,codi_estat_sequera_hidrol", $order: "data_canvi_estat_sequera, :id" },
  );
  const byMuni = new Map<string, DroughtEvent[]>();
  let latest = "";
  for (const r of rows) {
    const k = muniKey(r.municipi);
    const d = r.data_canvi_estat_sequera.slice(0, 10);
    if (d > latest) latest = d;
    const arr = byMuni.get(k) ?? [];
    arr.push({ date: d, phase: phaseFromCode(r.codi_estat_sequera_hidrol) });
    byMuni.set(k, arr);
  }
  return { byMuni, fetchedAt: new Date().toISOString(), latestDataDate: latest };
}

export function currentPhase(events: DroughtEvent[] | undefined): DroughtEvent | null {
  return events?.at(-1) ?? null;
}

/** Days spent in each phase during a calendar year (state carries over from before). */
export function phaseDaysInYear(events: DroughtEvent[] | undefined, year: number): Record<Phase, number> {
  const out: Record<Phase, number> = { normal: 0, "pre-alert": 0, alert: 0, exceptional: 0, emergency: 0 };
  if (!events?.length) return out;
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year + 1, 0, 1);
  let phase: Phase = "normal";
  let cursor = start;
  for (const e of events) {
    const t = Date.parse(e.date);
    if (t <= start) {
      phase = e.phase;
      continue;
    }
    if (t >= end) break;
    out[phase] += (t - cursor) / 864e5;
    cursor = t;
    phase = e.phase;
  }
  out[phase] += (end - cursor) / 864e5;
  return out;
}
