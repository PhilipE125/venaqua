import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Range } from "./costs";
import { DEFAULT_SECTOR_DEMAND } from "./sectorDemand";
import type { SectorId } from "./sectors";
import type { Phase } from "./sources/drought";

export type LayerKey = "wwtp" | "regen" | "companies" | "reservoirs" | "tenders" | "projects" | "clusters";
export type Selection =
  | { kind: "wwtp" | "regen" | "company"; id: string }
  | { kind: "comarca"; id: string }
  | { kind: "region"; id: "catalonia" }
  | null;

export type Mode = "q1" | "q2" | "q3" | "q4" | "q5" | "all";

export const QUESTIONS: { mode: Exclude<Mode, "all">; who: string; short: string; q: string }[] = [
  { mode: "q1", who: "Plant operator", short: "Who would buy my water?", q: "Who within 10 km would buy my reclaimed water, and how much?" },
  { mode: "q2", who: "Factory manager", short: "Is recycled water cheaper?", q: "Is there reuse-ready water near me, and is it cheaper than my tariff?" },
  { mode: "q3", who: "Factory, on site", short: "Build or connect?", q: "How much could reusing my own water on site save me, compared with a grid solution?" },
  { mode: "q4", who: "City or region", short: "Which links help most?", q: "Which reuse links in Catalonia would take the most pressure off the most stressed sources?" },
  { mode: "q5", who: "Factory, future", short: "How exposed am I later?", q: "As tariffs and drought restrictions rise, how exposed is my site, and when does reuse pay off?" },
];

// Which map layers each question needs.
export const MODE_PRESETS: Record<Mode, Record<LayerKey, boolean>> = {
  q1: { wwtp: true, regen: true, companies: true, reservoirs: false, tenders: false, projects: false, clusters: false },
  q2: { wwtp: true, regen: true, companies: true, reservoirs: false, tenders: false, projects: false, clusters: false },
  q3: { wwtp: false, regen: true, companies: true, reservoirs: false, tenders: false, projects: false, clusters: false },
  q4: { wwtp: true, regen: true, companies: false, reservoirs: true, tenders: false, projects: true, clusters: true },
  q5: { wwtp: false, regen: true, companies: true, reservoirs: true, tenders: false, projects: false, clusters: false },
  all: { wwtp: true, regen: true, companies: true, reservoirs: true, tenders: true, projects: true, clusters: true },
};

export interface Settings {
  sectorDemand: Record<SectorId, number>;
  tariff: number; // €/m3
  dischargeCharge: number; // €/m3
  rate: number;
  years: number;
  electricity: { low: number; base: number; high: number }; // €/kWh
  detourFactor: number;
  frictionPer10km: number; // m
  pumpEfficiency: number;
  pipeCostPerKm: Range;
  polishing: Range;
  reclaimedPrice: Range;
  recoveryRate: Range;
  onsiteCapex: Range; // € per m3/day
  onsiteOpex: Range; // €/m3
  droughtCut: Record<Phase, number>; // share of industrial supply cut
  valuePerM3Lost: number;
}

// Defaults: every value is an assumption; sources are listed in the settings dialog.
export const DEFAULT_SETTINGS: Settings = {
  sectorDemand: DEFAULT_SECTOR_DEMAND,
  tariff: 1.92,
  dischargeCharge: 0.8,
  rate: 0.06,
  years: 20,
  electricity: { low: 0.1, base: 0.15, high: 0.22 },
  detourFactor: 1.3,
  frictionPer10km: 20,
  pumpEfficiency: 0.7,
  pipeCostPerKm: [150_000, 400_000],
  polishing: [0.25, 0.6],
  reclaimedPrice: [0.3, 0.6],
  recoveryRate: [0.5, 0.7],
  onsiteCapex: [1_000, 2_500],
  onsiteOpex: [0.5, 1.2],
  droughtCut: { normal: 0, "pre-alert": 0, alert: 0.05, exceptional: 0.15, emergency: 0.25 },
  valuePerM3Lost: 5,
};

const KEY = "reuse-match:settings:v2";
const CONFIRMED_KEY = "reuse-match:confirmed";
const DEMAND_KEY = "reuse-match:demand";

interface AppState {
  layers: Record<LayerKey, boolean>;
  toggleLayer: (k: LayerKey) => void;
  selection: Selection;
  select: (s: Selection) => void;
  maxKm: number;
  setMaxKm: (n: number) => void;
  sector: SectorId | "all";
  setSector: (s: SectorId | "all") => void;
  minCapacity: number;
  setMinCapacity: (n: number) => void;
  settings: Settings;
  setSettings: (s: Settings) => void;
  dark: boolean;
  setDark: (d: boolean) => void;
  confirmed: Set<string>;
  toggleConfirmed: (id: string) => void;
  demandOverride: Record<string, number>;
  setDemandOverride: (id: string, v: number | null) => void;
  mode: Mode;
  setMode: (m: Mode) => void;
  tip: boolean;
  dismissTip: () => void;
  landing: boolean;
  setLanding: (b: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (b: boolean) => void;
}

const Ctx = createContext<AppState | null>(null);

function load<T>(k: string, fallback: T): T {
  try {
    const s = localStorage.getItem(k);
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    wwtp: true,
    regen: true,
    companies: true,
    reservoirs: true,
    tenders: true,
    projects: true,
    clusters: true,
  });
  const [mode, setModeState] = useState<Mode>("all");
  const [tip, setTip] = useState(false);
  const [selection, select] = useState<Selection>(null);
  const [maxKm, setMaxKm] = useState(10);
  const [sector, setSector] = useState<SectorId | "all">("all");
  const [minCapacity, setMinCapacity] = useState(0);
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  const [dark, setDark] = useState(false);
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
  const [demandOverride, setDemand] = useState<Record<string, number>>({});
  const [landing, setLanding] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const s = load<Partial<Settings>>(KEY, {});
    setSettingsState({ ...DEFAULT_SETTINGS, ...s, sectorDemand: { ...DEFAULT_SECTOR_DEMAND, ...s.sectorDemand } });
    setConfirmed(new Set(load<string[]>(CONFIRMED_KEY, [])));
    setDemand(load<Record<string, number>>(DEMAND_KEY, {}));
    setTip(!load<boolean>("reuse-match:tip-done", false));
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const value = useMemo<AppState>(
    () => ({
      layers,
      toggleLayer: (k) => setLayers((l) => ({ ...l, [k]: !l[k] })),
      selection,
      select: (s) => {
        select(s);
        if (s) setLanding(false);
      },
      maxKm,
      setMaxKm,
      sector,
      setSector,
      minCapacity,
      setMinCapacity,
      settings,
      setSettings: (s) => {
        setSettingsState(s);
        localStorage.setItem(KEY, JSON.stringify(s));
      },
      dark,
      setDark,
      confirmed,
      toggleConfirmed: (id) =>
        setConfirmed((prev) => {
          const n = new Set(prev);
          if (n.has(id)) n.delete(id);
          else n.add(id);
          localStorage.setItem(CONFIRMED_KEY, JSON.stringify([...n]));
          return n;
        }),
      demandOverride,
      setDemandOverride: (id, v) =>
        setDemand((prev) => {
          const n = { ...prev };
          if (v == null) delete n[id];
          else n[id] = v;
          localStorage.setItem(DEMAND_KEY, JSON.stringify(n));
          return n;
        }),
      mode,
      setMode: (m) => {
        setModeState(m);
        setLayers(MODE_PRESETS[m]);
        setLanding(false);
      },
      tip,
      dismissTip: () => {
        setTip(false);
        localStorage.setItem("reuse-match:tip-done", "true");
      },
      landing,
      setLanding,
      searchOpen,
      setSearchOpen,
    }),
    [layers, selection, maxKm, sector, minCapacity, settings, dark, confirmed, demandOverride, landing, searchOpen, mode, tip],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside provider");
  return v;
}
