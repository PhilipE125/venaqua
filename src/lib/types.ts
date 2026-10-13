import type { Quality } from "./sources/contract";
import type { SectorId } from "./sectors";

export type FeatureKind = "wwtp" | "regen" | "company" | "reservoir";

export interface BaseFeature {
  id: string;
  name: string;
  lat: number;
  lon: number;
  kind: FeatureKind;
}

export type TreatmentLevel = "primary" | "secondary" | "tertiary";

export interface Supply {
  designFlow: number; // m3/day, measured design value
  actualFlow: number; // m3/day, EEA or assumption
  actualQuality: Quality;
  utilisation: number | null;
  alreadyReused: number; // m3/day
  availableReclaimed: number; // m3/day
  suspect: string | null; // reason when values fail sanity checks
  eeaCode: string | null;
  reuseReady: boolean; // regen plant in municipality, or tertiary + filtration/UV
  eeaFiltration: boolean;
  eeaUV: boolean;
}

export interface Plant extends BaseFeature {
  kind: "wwtp";
  municipi: string;
  comarca: string;
  operator: string;
  manager: string;
  treatment: string;
  level: TreatmentLevel;
  capacity: number; // m3/day
  pe: number;
  receiving: string;
  year: string;
  steps: string[];
  factsheet?: string | undefined;
  codiAglomeracio: string;
  nuts?: string;
  national?: boolean;
  reuseReported?: number | null;
  supply?: Supply | undefined;
}

export interface ReuseByUse {
  agricultural: number;
  environmental: number;
  urban: number;
  recreational: number;
  industrial: number;
}

export interface RegenPlant extends BaseFeature {
  kind: "regen";
  municipi: string;
  comarca: string;
  operator: string;
  capacity: number; // m3/day
  treatments: string[];
  reusedVolume: number; // m3/year
  reuseByUse: ReuseByUse; // m3/year
  year: string;
  geocodedBy: "wwtp" | "nominatim";
}

export type BuyerStatus = "potential" | "water-intensive" | "confirmed";

export interface Company extends BaseFeature {
  kind: "company";
  municipi: string;
  ccae: string;
  activity: string;
  sector: SectorId;
  tipus: string;
  subtipus: string;
  sources: ("aca" | "eea")[];
  iedActivity?: string | undefined;
  dischargesToWater?: boolean | undefined;
  confirmedSource?: string | undefined;
}

export interface Reservoir extends BaseFeature {
  kind: "reservoir";
  fill: number; // %
  volume: number; // hm3
  date: string;
  note?: string; // shown instead of "% full" (river gauges in Germany)
}

export type SupplySite = Plant | RegenPlant;

export interface SourceResult<T> {
  features: T[];
  fetchedAt: string;
  excludedCount?: number;
  fetchedCount?: number;
  latestDataDate?: string;
}

export interface Tender {
  id: string;
  date: string;
  title: string;
  buyer: string;
  city: string;
  type: string;
  status: "open" | "award" | "other";
  value: number | null;
  currency: string | null;
  winner: string | null;
  deadline: string | null;
  url: string;
}

export interface ReuseProject {
  id: string;
  lat: number;
  lon: number;
  buyer: string;
  object: string;
  value: number | null;
  date: string;
  place: string;
  url: string | null;
}
