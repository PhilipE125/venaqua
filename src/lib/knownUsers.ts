import { normalize } from "./sectors";
import type { BuyerStatus, Company } from "./types";

// Static list of publicly reported industrial users of reclaimed water.
// No open dataset links companies to reuse contracts; this list comes from press coverage.
export const KNOWN_USERS = {
  plantPattern: "vila-seca",
  source: "Diari de Tarragona, 2020 (Camp de Tarragona chemical cluster supplied by ERA Vila-seca/Salou)",
  names: ["repsol", "basf", "dow ", "dow chemical", "ercros"],
  bbox: { minLat: 41.05, maxLat: 41.25, minLon: 1.0, maxLon: 1.35 },
};

export function knownUserSource(c: { name: string; lat: number; lon: number }): string | undefined {
  const b = KNOWN_USERS.bbox;
  if (c.lat < b.minLat || c.lat > b.maxLat || c.lon < b.minLon || c.lon > b.maxLon) return undefined;
  const n = normalize(c.name) + " ";
  return KNOWN_USERS.names.some((k) => n.includes(k)) ? KNOWN_USERS.source : undefined;
}

export function buyerStatus(c: Company, userConfirmed: Set<string>): BuyerStatus {
  if (userConfirmed.has(c.id) || c.confirmedSource) return "confirmed";
  if (c.sector === "food" || c.sector === "chemicals" || c.dischargesToWater) return "water-intensive";
  return "potential";
}

export const STATUS_LABEL: Record<BuyerStatus, string> = {
  potential: "Potential",
  "water-intensive": "Water-intensive",
  confirmed: "Confirmed",
};
