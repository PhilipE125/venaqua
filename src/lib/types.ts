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
}

export interface RegenPlant extends BaseFeature {
  kind: "regen";
  municipi: string;
  comarca: string;
  operator: string;
  capacity: number; // m3/day
  treatments: string[];
  reusedVolume: number; // m3/year
  reuseByUse: { agricultural: number; environmental: number; urban: number; recreational: number; industrial: number }; // m3/year
  year: string;
  geocodedBy: "wwtp" | "nominatim";
}

export interface Company extends BaseFeature {
  kind: "company";
  municipi: string;
  ccae: string;
  activity: string;
  sector: SectorId;
  tipus: string;
  subtipus: string;
}

export interface Reservoir extends BaseFeature {
  kind: "reservoir";
  fill: number; // %
  volume: number; // hm3
  date: string;
}

export type SupplySite = Plant | RegenPlant;

export interface SourceResult<T> {
  features: T[];
  fetchedAt: string;
  excludedCount?: number;
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
