import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { findClusters } from "./clusters";
import { knownUserSource } from "./knownUsers";
import { mergeCompanies } from "./merge";
import { effectiveSupply, scorePairs, type Match } from "./score";
import { fetchCompanies } from "./sources/companies";
import { fetchDrought } from "./sources/drought";
import { enrichPlants, fetchEeaSpain } from "./sources/eea";
import { fetchIedSpain } from "./sources/ied.functions";
import { fetchMeteo } from "./sources/meteo";
import { fetchProjects } from "./sources/projects";
import { fetchRegen } from "./sources/regen";
import { fetchPratHistory, fetchReservoirHistory, fetchReservoirs } from "./sources/reservoirs";
import { searchTenders } from "./sources/ted.functions";
import { fetchWwtps } from "./sources/wwtp";
import { useApp } from "./state";
import type { Company, SupplySite } from "./types";

const H = 60 * 60 * 1000;
const opts = { staleTime: H, gcTime: 2 * H, retry: 1, refetchOnWindowFocus: false } as const;

const useWwtpsRaw = () => useQuery({ queryKey: ["wwtp"], queryFn: fetchWwtps, ...opts });
export const useEea = () => useQuery({ queryKey: ["eea-es"], queryFn: fetchEeaSpain, ...opts });

export function useRegen() {
  const w = useWwtpsRaw();
  return useQuery({
    queryKey: ["regen"],
    queryFn: () => fetchRegen(w.data!.features),
    enabled: !!w.data,
    ...opts,
  });
}

/** Treatment plants enriched with EEA actual flows and reuse volumes. */
export function useWwtps() {
  const w = useWwtpsRaw();
  const e = useEea();
  const g = useRegen();
  const enriched = useMemo(
    () => (w.data ? enrichPlants(w.data.features, e.data?.plants, g.data?.features ?? []) : null),
    [w.data, e.data, g.data],
  );
  return useMemo(
    () => ({
      ...w,
      data: w.data && enriched ? { ...w.data, features: enriched.plants } : undefined,
      join: enriched && e.data ? { matched: enriched.matched, total: enriched.total } : null,
      eeaLoading: e.isLoading,
    }),
    [w, enriched, e.data, e.isLoading],
  );
}

const useAcaCompanies = () => useQuery({ queryKey: ["companies"], queryFn: fetchCompanies, ...opts });
export function useIed() {
  const fn = useServerFn(fetchIedSpain);
  return useQuery({ queryKey: ["ied-es"], queryFn: () => fn(), ...opts, staleTime: 24 * H, gcTime: 24 * H });
}

/** Catalan discharge permits merged with Spain-wide EEA industrial facilities. */
export function useCompanies() {
  const a = useAcaCompanies();
  const i = useIed();
  const merged = useMemo(() => {
    if (!a.data) return null;
    const m = mergeCompanies(a.data.features, i.data?.facilities ?? []);
    const companies: Company[] = m.companies.map((c) => {
      const src = knownUserSource(c);
      return src ? { ...c, confirmedSource: src } : c;
    });
    return { ...m, companies };
  }, [a.data, i.data]);
  return useMemo(
    () => ({
      ...a,
      data: a.data && merged ? { ...a.data, features: merged.companies } : undefined,
      ied: i,
      mergeStats: merged && i.data ? { merged: merged.merged, iedExcluded: merged.excluded, iedFetched: i.data.fetched } : null,
    }),
    [a, merged, i],
  );
}

export const useReservoirs = () => useQuery({ queryKey: ["reservoirs"], queryFn: fetchReservoirs, ...opts });
export const useReservoirHistory = () =>
  useQuery({ queryKey: ["reservoirs-90d"], queryFn: fetchReservoirHistory, ...opts });
export const usePrat = () => useQuery({ queryKey: ["prat-30d"], queryFn: fetchPratHistory, ...opts });
export const useDrought = () => useQuery({ queryKey: ["drought"], queryFn: fetchDrought, ...opts });
export function useProjects() {
  const w = useWwtpsRaw();
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => fetchProjects(w.data!.features),
    enabled: !!w.data,
    ...opts,
  });
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
  const fn = useServerFn(searchTenders);
  return useQuery({ queryKey: ["ted"], queryFn: () => fn(), ...opts });
}

/** Current stress = 1 − volume-weighted reservoir fill. */
export function useStress() {
  const h = useReservoirHistory();
  const last = h.data?.series.at(-1)?.value;
  return { stress: last != null ? 1 - last / 100 : 0.5, fill: last ?? null, known: last != null };
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

  return useMemo(() => {
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
  }, [w.data, r.data, c.data, maxKm, sector, minCapacity, settings, stress]);
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
  return useMemo(() => {
    if (!w.data || !c.data) return [];
    const plants = w.data.features
      .filter((p) => p.supply && p.supply.availableReclaimed > 0)
      .map((p) => ({ id: p.id, lat: p.lat, lon: p.lon, available: p.supply!.availableReclaimed }));
    const companies = c.data.features
      .filter((x) => x.lat > 40 && x.lat < 43.2 && x.lon > 0 && x.lon < 3.5)
      .map((x) => ({ id: x.id, lat: x.lat, lon: x.lon, demand: settings.sectorDemand[x.sector] ?? 0 }));
    return findClusters(plants, companies, { maxKm, pipeCostPerKm: settings.pipeCostPerKm, rate: settings.rate, years: settings.years });
  }, [w.data, c.data, maxKm, settings]);
}
