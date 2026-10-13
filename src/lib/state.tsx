import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_SECTOR_DEMAND } from "./sectorDemand";
import type { SectorId } from "./sectors";

export type LayerKey = "wwtp" | "regen" | "companies" | "reservoirs" | "tenders";
export type Selection = { kind: "wwtp" | "regen" | "company"; id: string } | null;

export interface Settings {
  sectorDemand: Record<SectorId, number>;
  pipeCostPerKm: number; // EUR, placeholder
  tariff: number; // EUR/m3
  reclaimedPrice: number; // EUR/m3, placeholder
}

export const DEFAULT_SETTINGS: Settings = {
  sectorDemand: DEFAULT_SECTOR_DEMAND,
  pipeCostPerKm: 250_000, // TODO placeholder
  tariff: 1.92, // INE Spain 2020 average
  reclaimedPrice: 0.45, // TODO placeholder
};

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
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    wwtp: true,
    regen: true,
    companies: true,
    reservoirs: true,
    tenders: true,
  });
  const [selection, select] = useState<Selection>(null);
  const [maxKm, setMaxKm] = useState(10);
  const [sector, setSector] = useState<SectorId | "all">("all");
  const [minCapacity, setMinCapacity] = useState(0);
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem("reuse-match:settings");
      if (s) setSettingsState({ ...DEFAULT_SETTINGS, ...JSON.parse(s) });
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const value = useMemo<AppState>(
    () => ({
      layers,
      toggleLayer: (k) => setLayers((l) => ({ ...l, [k]: !l[k] })),
      selection,
      select,
      maxKm,
      setMaxKm,
      sector,
      setSector,
      minCapacity,
      setMinCapacity,
      settings,
      setSettings: (s) => {
        setSettingsState(s);
        localStorage.setItem("reuse-match:settings", JSON.stringify(s));
      },
      dark,
      setDark,
    }),
    [layers, selection, maxKm, sector, minCapacity, settings, dark],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside provider");
  return v;
}
