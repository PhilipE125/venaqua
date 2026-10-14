import type { DroughtEvent, Phase } from "./drought";

// French drought restrictions (VigiEau, Ministry of Ecological Transition): CORS open, no key.
// The nationwide zones file is ~400 MB, so we look up one point at a time and use the
// per-department summary for the national figure.
const API = "https://api.vigieau.gouv.fr/api";

export type Gravite = "vigilance" | "alerte" | "alerte_renforcee" | "crise";
export const GRAVITES: Gravite[] = ["vigilance", "alerte", "alerte_renforcee", "crise"];
export const GRAVITE_LABEL: Record<Gravite, string> = { vigilance: "Vigilance", alerte: "Alerte", alerte_renforcee: "Alerte renforcée", crise: "Crise" };
// Mapped onto the Catalan drought phases so the existing cost model (droughtCut per phase) applies.
export const PHASE_OF: Record<Gravite, Phase> = { vigilance: "pre-alert", alerte: "alert", alerte_renforcee: "exceptional", crise: "emergency" };

const worse = (a: Gravite | null, b: Gravite | null) => (GRAVITES.indexOf(b as Gravite) > GRAVITES.indexOf(a as Gravite) ? b : a);

export interface Restriction extends DroughtEvent {
  level: Gravite | null; // null = no restriction in force
  zone: string;
}

/** Most severe restriction in force for businesses at a point (a site can sit in surface, groundwater and drinking-water zones). */
export async function fetchRestriction(lat: number, lon: number): Promise<Restriction> {
  const r = await fetch(`${API}/zones?lon=${lon.toFixed(4)}&lat=${lat.toFixed(4)}&profil=entreprise`);
  if (!r.ok) throw new Error(`VigiEau HTTP ${r.status}`);
  const zones = (await r.json()) as { nom: string; niveauGravite: Gravite | null }[];
  let level: Gravite | null = null;
  let zone = "";
  for (const z of zones) {
    const w = worse(level, z.niveauGravite);
    if (w !== level) {
      level = w;
      zone = z.nom;
    }
  }
  return { date: new Date().toISOString().slice(0, 10), phase: level ? PHASE_OF[level] : "normal", level, zone };
}

export interface DepartmentLevel {
  code: string;
  name: string;
  level: Gravite | null;
}

export async function fetchDepartments(): Promise<DepartmentLevel[]> {
  const r = await fetch(`${API}/departements`);
  if (!r.ok) throw new Error(`VigiEau HTTP ${r.status}`);
  const rows = (await r.json()) as { code: string; nom: string; niveauGraviteMax: Gravite | null }[];
  // Metropolitan departments only (overseas codes are 971-976), to match the plants on the map.
  return rows.filter((d) => d.code.length <= 2).map((d) => ({ code: d.code, name: d.nom, level: d.niveauGraviteMax }));
}

/** National stress 0..1: mean department level (none 0, vigilance 0.25 … crise 1). */
export function departmentStress(deps: DepartmentLevel[]): number | null {
  if (!deps.length) return null;
  return deps.reduce((s, d) => s + (d.level ? (GRAVITES.indexOf(d.level) + 1) / GRAVITES.length : 0), 0) / deps.length;
}
