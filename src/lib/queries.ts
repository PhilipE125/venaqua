import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useMemo } from "react";
import { findClusters } from "./clusters";
import { knownUserSource } from "./knownUsers";
import { mergeCompanies } from "./merge";
import { effectiveSupply, scorePairs, type Match } from "./score";
import { fetchCompanies } from "./sources/companies";
import { fetchDrought } from "./sources/drought";
import { enrichPlants, fetchEea, nationalPlant } from "./sources/eea";
import { fetchIed } from "./sources/ied.functions";
import { fetchMeteo } from "./sources/meteo";
import { fetchProjects } from "./sources/projects";
import { fetchGauges, lowWaterShare } from "./sources/pegel";
import { fetchRegen } from "./sources/regen";
import { fetchPratHistory, fetchReservoirHistory, fetchReservoirs } from "./sources/reservoirs";
import { searchTenders } from "./sources/ted.functions";
import { fetchWwtps } from "./sources/wwtp";
import { useApp, type Region } from "./state";
import type { Company, SupplySite } from "./types";

const H = 60 * 60 * 1000;
const opts = { staleTime: H, gcTime: 2 * H, retry: 1, refetchOnWindowFocus: false } as const;

// One result per input set, shared by every component that calls the hook, so the heavy
// derivations (plant join, company merge, pair scoring, clusters) run once, not once per caller.
type Slot = { deps?: unknown[]; value?: unknown };
function shared<T>(slot: Slot, deps: unknown[], fn: () => T): T {
  if (!slot.deps || slot.deps.length !== deps.length || slot.deps.some((d, i) => !Object.is(d, deps[i]))) {
    slot.value = fn();
    slot.deps = deps;
  }
  return slot.value as T;
}
const slots = { plants: {} as Slot, plantsData: {} as Slot, companies: {} as Slot, companiesData: {} as Slot, matches: {} as Slot, clusters: {} as Slot };

const country = (region: Region) => (region === "de" ? "DE" : "ES");

// Catalan-only sources (ACA plants' regeneration, projects, drought phases, El Prat) are empty in Germany.
function catalanOnly<T extends { data?: unknown; isLoading: boolean }>(q: T, region: Region): T {
  return region === "de" ? { ...q, data: undefined, isLoading: false } : q;
}

const useWwtpsRaw = () => useQuery({ queryKey: ["wwtp"], queryFn: fetchWwtps, ...opts });
// Query definitions shared by the hooks and by usePrefetchRegion, so a prefetch fills the same cache entry.
const eeaQuery = (c: "ES" | "DE") => ({ queryKey: ["eea", c], queryFn: () => fetchEea(c), ...opts, staleTime: 24 * H, gcTime: 24 * H });
const iedQuery = (c: "ES" | "DE", fn: (o: { data: "ES" | "DE" }) => ReturnType<typeof fetchIed> = fetchIed) => ({ queryKey: ["ied", c], queryFn: () => fn({ data: c }), ...opts, staleTime: 24 * H, gcTime: 24 * H });
const reservoirsQuery = (de: boolean) => ({ queryKey: ["reservoirs", de], queryFn: de ? fetchGauges : fetchReservoirs, ...opts, staleTime: de ? H / 4 : H });

/** Start loading a region's national layers before it is picked (e.g. when the region menu opens). */
export function usePrefetchRegion() {
  const qc = useQueryClient();
  return useCallback(
    (r: Region) => {
      const c = country(r);
      void qc.prefetchQuery(eeaQuery(c));
      void qc.prefetchQuery(iedQuery(c));
      void qc.prefetchQuery(reservoirsQuery(r === "de"));
    },
    [qc],
  );
}

export function useEea() {
  return useQuery(eeaQuery(country(useApp().region)));
}

export function useRegen() {
  const { region } = useApp();
  const w = useWwtpsRaw();
  const q = useQuery({
    queryKey: ["regen"],
    queryFn: () => fetchRegen(w.data!.features),
    enabled: !!w.data,
    ...opts,
  });
  return catalanOnly(q, region);
}

/** Treatment plants enriched with EEA actual flows and reuse volumes. */
export function useWwtps() {
  const { region } = useApp();
  const w = useWwtpsRaw();
  const e = useEea();
  const g = useRegen();
  const enriched = shared(slots.plants, [w.data, e.data, g.data, region], () => {
    if (region === "de") {
      const plants = [...(e.data?.plants.values() ?? [])].map(nationalPlant).filter((p): p is NonNullable<typeof p> => p !== null);
      return { plants, matched: 0, total: 0 };
    }
    const cat = w.data ? enrichPlants(w.data.features, e.data?.plants, g.data?.features ?? []) : null;
    if (region === "cat") return cat;
    const joined = new Set((cat?.plants ?? []).map(p => p.supply?.eeaCode).filter(Boolean));
    const national = [...(e.data?.plants.values() ?? [])].filter(p => !joined.has(p.code)).map(nationalPlant).filter((p): p is NonNullable<typeof p> => p !== null);
    return { plants: [...(cat?.plants ?? []), ...national], matched: cat?.matched ?? 0, total: cat?.total ?? 0 };
  });
  // useQuery returns a fresh object every render: key `data` on its stable parts only,
  // or every consumer's memo (scoring, map layers) recomputes on every render.
  const data = shared(slots.plantsData, [enriched, w.data, e.data?.fetchedAt], () =>
    enriched ? { ...(w.data ?? { fetchedAt: e.data?.fetchedAt ?? "" }), features: enriched.plants } : undefined,
  );
  const join = useMemo(() => (enriched && e.data ? { matched: enriched.matched, total: enriched.total } : null), [enriched, e.data]);
  return {
    ...w,
    isLoading: region === "es" ? w.isLoading && e.isLoading : region === "de" ? e.isLoading : w.isLoading,
    data,
    join,
    eeaLoading: e.isLoading,
  };
}

const useAcaCompanies = () => useQuery({ queryKey: ["companies"], queryFn: fetchCompanies, ...opts });
export function useIed() {
  const fn = useServerFn(fetchIed);
  return useQuery(iedQuery(country(useApp().region), fn));
}

/** Catalan discharge permits merged with Spain-wide EEA industrial facilities. */
export function useCompanies() {
  const { region } = useApp();
  const a = useAcaCompanies();
  const i = useIed();
  const merged = shared(slots.companies, [a.data, i.data, region], () => {
    if (!a.data && !i.data) return null;
    const m = mergeCompanies(region === "de" ? [] : a.data?.features ?? [], i.data?.facilities ?? []);
    const companies: Company[] = m.companies.map((c) => {
      const src = knownUserSource(c);
      return src ? { ...c, confirmedSource: src } : c;
    });
    return { ...m, companies: region === "cat" ? companies.filter(c => c.lat > 40.4 && c.lat < 42.9 && c.lon > 0.1 && c.lon < 3.4) : companies };
  });
  const data = shared(slots.companiesData, [merged, a.data, i.data?.fetchedAt, region], () =>
    merged ? { ...((region !== "de" && a.data) || { fetchedAt: i.data?.fetchedAt ?? "" }), features: merged.companies } : undefined,
  );
  const mergeStats = useMemo(
    () => (merged && i.data ? { merged: merged.merged, iedExcluded: merged.excluded, iedFetched: i.data.fetched } : null),
    [merged, i.data],
  );
  return { ...a, isLoading: a.isLoading && i.isLoading, data, ied: i, mergeStats };
}

/** Catalan reservoirs, or in Germany the federal river gauges (same shape, fill mapped from low/normal/high water). */
export function useReservoirs() {
  return useQuery(reservoirsQuery(useApp().region === "de"));
}
export const useReservoirHistory = () =>
  catalanOnly(useQuery({ queryKey: ["reservoirs-90d"], queryFn: fetchReservoirHistory, ...opts }), useApp().region);
export const usePrat = () => catalanOnly(useQuery({ queryKey: ["prat-30d"], queryFn: fetchPratHistory, ...opts }), useApp().region);
export const useDrought = () => catalanOnly(useQuery({ queryKey: ["drought"], queryFn: fetchDrought, ...opts }), useApp().region);
export function useProjects() {
  const { region } = useApp();
  const w = useWwtpsRaw();
  const q = useQuery({
    queryKey: ["projects"],
    queryFn: () => fetchProjects(w.data!.features),
    enabled: !!w.data,
    ...opts,
  });
  return catalanOnly(q, region);
}
export const useMeteo = (lat?: number, lon?: number) =>
  useQuery({
    queryKey: ["meteo", lat, lon],
    queryFn: () => fetchMeteo(lat!, lon!),
    enabled: lat != null && lon != null,
    ...opts,
  });

export function useElevation(a?: { lat: number; lon: number }, b?: { lat: number; lon: number }) {
  return useQuery({
    queryKey: ["elev", a?.lat, a?.lon, b?.lat, b?.lon],
    enabled: !!a && !!b,
    ...opts,
    queryFn: async () => {
      const r = await fetch(
        `https://api.open-meteo.com/v1/elevation?latitude=${a!.lat.toFixed(4)},${b!.lat.toFixed(4)}&longitude=${a!.lon.toFixed(4)},${b!.lon.toFixed(4)}`,
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as { elevation: number[] };
      return { a: j.elevation[0] ?? 0, b: j.elevation[1] ?? 0 };
    },
  });
}

export function useTenders() {
  const c = useApp().region === "de" ? "DEU" : "ESP";
  const fn = useServerFn(searchTenders);
  return useQuery({ queryKey: ["ted", c], queryFn: () => fn({ data: c }), ...opts });
}

/** Current stress = 1 − volume-weighted reservoir fill. */
/** Current stress = 1 − volume-weighted reservoir fill; in Germany, the share of river gauges at low water. */
export function useStress() {
  const de = useApp().region === "de";
  const h = useReservoirHistory();
  const g = useReservoirs();
  if (de) {
    const low = lowWaterShare(g.data?.features ?? []);
    return { stress: low ?? 0.5, fill: null, known: low != null, lowWater: low };
  }
  const last = h.data?.series.at(-1)?.value;
  return { stress: last != null ? 1 - last / 100 : 0.5, fill: last ?? null, known: last != null, lowWater: null };
}

export interface Derived {
  sites: SupplySite[];
  siteById: Map<string, SupplySite>;
  companyById: Map<string, Company>;
  matches: Match[]; // all pairs within maxKm, normalised
  filtered: Match[]; // with sector/minCapacity filters, sorted desc
}

export function useMatches(): Derived {
  const { maxKm, sector, minCapacity, settings } = useApp();
  const w = useWwtps();
  const r = useRegen();
  const c = useCompanies();
  const { stress } = useStress();

  return shared(slots.matches, [w.data, r.data, c.data, maxKm, sector, minCapacity, settings, stress], () => {
    const sites: SupplySite[] = [...(w.data?.features ?? []), ...(r.data?.features ?? [])];
    const companies = c.data?.features ?? [];
    const siteById = new Map(sites.map((s) => [s.id, s]));
    const companyById = new Map(companies.map((x) => [x.id, x]));
    const matches = scorePairs(
      sites.map((s) => ({ id: s.id, lat: s.lat, lon: s.lon, supply: effectiveSupply(s.capacity, s.kind === "regen") })),
      companies.map((x) => ({ id: x.id, lat: x.lat, lon: x.lon, demand: settings.sectorDemand[x.sector] ?? 0 })),
      { maxKm, stress },
    );
    const filtered = matches
      .filter((m) => {
        const s = siteById.get(m.siteId)!;
        const co = companyById.get(m.companyId)!;
        return s.capacity >= minCapacity && (sector === "all" || co.sector === sector);
      })
      .sort((a, b) => b.score - a.score);
    return { sites, siteById, companyById, matches, filtered };
  });
}

export const fmt = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
export const fmt1 = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });
export const fmt2 = new Intl.NumberFormat("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const eur = new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
export const eurK = (v: number) =>
  Math.abs(v) >= 1e6 ? `€${fmt1.format(v / 1e6)}M` : Math.abs(v) >= 1e3 ? `€${fmt.format(v / 1e3)}k` : `€${fmt.format(v)}`;

/** Shared-pipe clusters around plants with available reclaimed water. */
export function useClusters() {
  const { maxKm, settings } = useApp();
  const w = useWwtps();
  const c = useCompanies();
  return shared(slots.clusters, [w.data, c.data, maxKm, settings], () => {
    if (!w.data || !c.data) return [];
    const plants = w.data.features
      .filter((p) => p.supply && p.supply.availableReclaimed > 0)
      .map((p) => ({ id: p.id, lat: p.lat, lon: p.lon, available: p.supply!.availableReclaimed }));
    const companies = c.data.features
      .filter((x) => x.lat > 40 && x.lat < 43.2 && x.lon > 0 && x.lon < 3.5)
      .map((x) => ({ id: x.id, lat: x.lat, lon: x.lon, demand: settings.sectorDemand[x.sector] ?? 0 }));
    return findClusters(plants, companies, { maxKm, pipeCostPerKm: settings.pipeCostPerKm, rate: settings.rate, years: settings.years });
  });
}
