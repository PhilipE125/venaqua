import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Range } from "./costs";
import { DEFAULT_SECTOR_DEMAND } from "./sectorDemand";
import type { SectorId } from "./sectors";
import type { Phase } from "./sources/drought";

export type LayerKey = "wwtp" | "regen" | "companies" | "reservoirs" | "tenders" | "projects" | "clusters" | "rivers";
export type Selection =
  | { kind: "wwtp" | "regen" | "company"; id: string }
  | { kind: "comarca"; id: string }
  | { kind: "region"; id: "catalonia" }
  | null;

export type Region = "es" | "cat" | "de" | "fr";

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
  q1: { wwtp: true, regen: true, companies: true, reservoirs: false, tenders: false, projects: false, clusters: false, rivers: false },
  q2: { wwtp: true, regen: true, companies: true, reservoirs: false, tenders: false, projects: false, clusters: false, rivers: false },
  q3: { wwtp: false, regen: true, companies: true, reservoirs: false, tenders: false, projects: false, clusters: false, rivers: false },
  q4: { wwtp: true, regen: true, companies: false, reservoirs: true, tenders: false, projects: true, clusters: true, rivers: false },
  q5: { wwtp: false, regen: true, companies: true, reservoirs: true, tenders: false, projects: false, clusters: false, rivers: true },
  // No module selected = calm neutral explore view (same as the first load).
  all: { wwtp: true, regen: true, companies: true, reservoirs: false, tenders: false, projects: false, clusters: false, rivers: false },
};
// Calm first view: plants first; companies fade in once zoomed in; extras stay off until switched on.
export const CALM_LAYERS: Record<LayerKey, boolean> = { wwtp: true, regen: true, companies: true, reservoirs: false, tenders: false, projects: false, clusters: false, rivers: false
};

export interface Settings {
  sectorDemand: Record<SectorId, number>;
  tariffs: Record<Region, Tariff>; // per region, €/m3
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
  onsiteScaleExponent: number; // economies of scale for on-site reuse
  capexGrantShare: number; // 0-0.5, grants that reduce B and C capex
  riskHighShare: number; // risk matrix: High above this share of the yearly water bill
  riskMediumShare: number;
  visibleShare: number; // local visibility: share of comarca business water
  visibleResidents: number; // local visibility: resident-equivalents
  ownFeedCoupling: number; // 0-1: share of an on-site plant's output that falls with the mains cut
}

export interface Tariff {
  supply: number; // drinking-water supply €/m3
  discharge: number; // sewerage and treatment €/m3 (charged on the share of water discharged)
}

// Average household tariffs split into supply and sewerage, used as a proxy for industrial
// users (industrial tariffs are set per utility and rarely published). Keeping the two parts
// apart avoids counting sewerage twice.
// ES/CAT: INE table 01003, 2022 (ES 1.16 + 0.76 = 1.92; Catalonia 1.58 + 1.40 = 2.98).
// FR: OFB/SISPEA, 1 Jan 2024 (2.32 + 2.37 = 4.69 incl. VAT).
// DE: Baden-Württemberg statistics office via ZfK, 2024 (2.59 + 2.24 = 4.83); no national figure.
export const REGION_TARIFFS: Record<Region, Tariff> = {
  es: { supply: 1.16, discharge: 0.76 },
  cat: { supply: 1.58, discharge: 1.4 },
  fr: { supply: 2.32, discharge: 2.37 },
  de: { supply: 2.59, discharge: 2.24 },
};

// Defaults: every value is an assumption; sources are listed in the settings dialog.
export const DEFAULT_SETTINGS: Settings = {
  sectorDemand: DEFAULT_SECTOR_DEMAND,
  tariffs: REGION_TARIFFS,
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
  onsiteScaleExponent: 0.7,
  capexGrantShare: 0,
  riskHighShare: 0.02,
  riskMediumShare: 0.005,
  visibleShare: 0.01,
  visibleResidents: 5000,
  ownFeedCoupling: 0.5,
};

// v4: added ownFeedCoupling; older saved settings would leave it undefined.
const KEY = "reuse-match:settings:v4";
const CONFIRMED_KEY = "reuse-match:confirmed";
const DEMAND_KEY = "reuse-match:demand";

export interface MapCamera { longitude: number; latitude: number; zoom: number; bearing: number; pitch: number }

interface AppState {
  camera: MapCamera | null;
  setCamera: (v: MapCamera) => void;
  cameraFocus: string | null;
  setCameraFocus: (v: string | null) => void;
  scenarioValues: Record<string, unknown>;
  updateScenario: (key: string, value: unknown) => void;
  region: Region;
  setRegion: (r: Region) => void;
  panelOpen: boolean;
  setPanelOpen: (b: boolean) => void;
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
  horizon: string | null;
  setHorizon: (h: string | null) => void;
  showPipes: boolean;
  setShowPipes: (b: boolean) => void;
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
  const [camera, setCamera] = useState<MapCamera | null>(null);
  const [cameraFocus, setCameraFocus] = useState<string | null>(null);
  const [scenarioValues, setScenarioValues] = useState<Record<string, unknown>>({});
  const [region, setRegion] = useState<Region>("es");
  const [panelOpen, setPanelOpen] = useState(false);
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>(CALM_LAYERS);
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
  const [horizon, setHorizon] = useState<string | null>(null);
  const [showPipes, setShowPipes] = useState(false);

  useEffect(() => {
    const s = load<Partial<Settings>>(KEY, {});
    setSettingsState({ ...DEFAULT_SETTINGS, ...s, sectorDemand: { ...DEFAULT_SECTOR_DEMAND, ...s.sectorDemand }, tariffs: { ...REGION_TARIFFS, ...s.tariffs } });
    setConfirmed(new Set(load<string[]>(CONFIRMED_KEY, [])));
    setDemand(load<Record<string, number>>(DEMAND_KEY, {}));
    setTip(!load<boolean>("reuse-match:tip-done", false));
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const value = useMemo<AppState>(
    () => ({
      camera, setCamera, cameraFocus, setCameraFocus, scenarioValues,
      updateScenario: (key, v) => setScenarioValues(prev => ({ ...prev, [key]: v })),
      region,
      setRegion: r => { setRegion(r); setCamera(null); setCameraFocus(null); select(null); },
      panelOpen,
      setPanelOpen,
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
      horizon, setHorizon, showPipes, setShowPipes,
    }),
    [horizon, showPipes, camera, cameraFocus, scenarioValues, layers, selection, maxKm, sector, minCapacity, settings, dark, confirmed, demandOverride, landing, searchOpen, mode, tip, region, panelOpen],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside provider");
  return v;
}

export function useScenarioState<T>(key: string, fallback: T): [T, (value: T) => void] {
  const { scenarioValues, updateScenario } = useApp();
  const value = scenarioValues[key] === undefined ? fallback : scenarioValues[key] as T;
  return [value, (next: T) => updateScenario(key, next)];
}
