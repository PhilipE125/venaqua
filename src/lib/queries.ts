import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { effectiveSupply, scorePairs, type Match } from "./score";
import { fetchCompanies } from "./sources/companies";
import { fetchMeteo } from "./sources/meteo";
import { fetchRegen } from "./sources/regen";
import { fetchPratHistory, fetchReservoirHistory, fetchReservoirs } from "./sources/reservoirs";
import { searchTenders } from "./sources/ted.functions";
import { fetchWwtps } from "./sources/wwtp";
import { useApp } from "./state";
import type { Company, SupplySite } from "./types";

const H = 60 * 60 * 1000;
const opts = { staleTime: H, gcTime: 2 * H, retry: 1, refetchOnWindowFocus: false } as const;

export const useWwtps = () => useQuery({ queryKey: ["wwtp"], queryFn: fetchWwtps, ...opts });
export function useRegen() {
  const w = useWwtps();
  return useQuery({
    queryKey: ["regen"],
    queryFn: () => fetchRegen(w.data!.features),
    enabled: !!w.data,
    ...opts,
  });
}
export const useCompanies = () => useQuery({ queryKey: ["companies"], queryFn: fetchCompanies, ...opts });
export const useReservoirs = () => useQuery({ queryKey: ["reservoirs"], queryFn: fetchReservoirs, ...opts });
export const useReservoirHistory = () =>
  useQuery({ queryKey: ["reservoirs-90d"], queryFn: fetchReservoirHistory, ...opts });
export const usePrat = () => useQuery({ queryKey: ["prat-30d"], queryFn: fetchPratHistory, ...opts });
export const useMeteo = (lat?: number, lon?: number) =>
  useQuery({
    queryKey: ["meteo", lat, lon],
    queryFn: () => fetchMeteo(lat!, lon!),
    enabled: lat != null && lon != null,
    ...opts,
  });
export function useTenders() {
  const fn = useServerFn(searchTenders);
  return useQuery({ queryKey: ["ted"], queryFn: () => fn(), ...opts });
}

/** Current stress = 1 - average reservoir fill. */
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
export const eur = new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
