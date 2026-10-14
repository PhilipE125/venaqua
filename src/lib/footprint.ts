// A site's draw on local mains water under each option, compared with its comarca's use.
export type Choice = "status" | "own" | "connect" | "shared";

/** Share of demand still bought from mains: all of it, the part on-site reuse doesn't recover, or the part a connection doesn't cover. */
export function mainsShare(choice: Choice, p: { recovery: number; coverage: number | null; sharedCoverage?: number | null }) {
  if (choice === "own") return 1 - Math.max(0, Math.min(1, p.recovery));
  if (choice === "connect") return 1 - Math.max(0, Math.min(1, p.coverage ?? 0));
  if (choice === "shared") return 1 - Math.max(0, Math.min(1, p.sharedCoverage ?? p.coverage ?? 0));
  return 1;
}

export interface ComarcaUse {
  business: number; // m³/year, economic activities on the network
  households: number; // m³/year
  perCapita: number; // litres per person per day
}

/** Daily mains draw, share of the comarca's business water and resident-equivalents. */
export function footprint(demandM3Day: number, share: number, c: ComarcaUse | null) {
  const drawDay = demandM3Day * share;
  return {
    drawDay,
    shareOfBusiness: c && c.business > 0 ? (drawDay * 365) / c.business : null,
    residents: c && c.perCapita > 0 ? (drawDay * 1000) / c.perCapita : null,
  };
}

/** Comarca key: no accents, no trailing article ("BAIX LLOBREGAT, EL" → "baix llobregat"). */
export function comarcaKey(s: string) {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/,\s*(el|la|els|les|l['’]?)\s*$/, "")
    .trim();
}
