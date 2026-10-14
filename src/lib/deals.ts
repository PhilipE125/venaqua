// Venaqua Reuse Pipeline – shared types, labels, scoring and filtering.
// Copy to src/lib/deals.ts. Vocabularies match schema.sql and build_deals.py.

export const KINDS = ["tender", "programme", "project", "private_opportunity", "market_signal"] as const;
export const STAGES = ["signal", "planning", "study", "tender_open", "tender_closed", "awarded", "in_execution", "operating"] as const;
export const SCOPES = ["regeneration_plant", "tertiary_upgrade", "plant_expansion", "reuse_network", "industrial_supply", "o_and_m", "engineering_study", "consulting"] as const;
export const SECTORS = ["agriculture", "municipal_green", "industry_chemical", "industry_manufacturing", "data_centre", "hydrogen", "golf_tourism", "airport", "aquifer_recharge", "indirect_potable", "environmental"] as const;
export const VALUE_BANDS = ["<1M", "1-10M", "10-50M", ">50M", "unknown"] as const;

export type Kind = (typeof KINDS)[number];
export type Stage = (typeof STAGES)[number];
export type Scope = (typeof SCOPES)[number];
export type Sector = (typeof SECTORS)[number];
export type ValueBand = (typeof VALUE_BANDS)[number];

export interface Deal {
  id: string;
  name: string;
  kind: Kind;
  stage: Stage;
  region: string;
  province: string;
  nuts3: string | null;
  municipality: string;
  lat: number;
  lng: number;
  location_precision: "site" | "municipality" | "province" | "region" | "multi";
  plant_ref?: string | null;
  scope: Scope[];
  offtaker_sectors: Sector[];
  buyer: string;
  offtakers: string;
  deal_model: string;
  value_eur: number | null;
  value_basis: "tender_budget" | "award" | "investment_announced" | "plan_total" | "estimate" | "unknown";
  volume_hm3: number | null;
  volume_basis: "source" | "derived" | "capacity_derived" | "scenario" | "unknown";
  deadline: string | null; // ISO date
  follow_on_expected: boolean;
  verification_status: "verified" | "source_linked" | "ai_extracted";
  sources: { label: string; url: string }[];
  notes: string;
  score_reuse_impact: number;
  score_offtaker: number;
  score_funding: number;
  score_timing: number;
  score_margin: number;
  score_water_stress: number;
  access_tier: "free" | "deal_flow";
  value_band: ValueBand;
  is_actionable: boolean;
  opportunity_score: number;
  last_verified: string;
}

// Mission first: reuse impact carries the most weight. Keep in sync with score_weights table.
export const WEIGHTS = { reuse_impact: 0.25, offtaker: 0.2, funding: 0.15, timing: 0.15, margin: 0.15, water_stress: 0.1 } as const;

export const SCORE_LABELS: Record<keyof typeof WEIGHTS, string> = {
  reuse_impact: "Reuse impact (freshwater replaced)",
  offtaker: "Strength of water buyers",
  funding: "Funding certainty",
  timing: "Timing (how soon it moves)",
  margin: "Margin potential",
  water_stress: "Local water stress",
};

export function opportunityScore(d: Pick<Deal, "score_reuse_impact" | "score_offtaker" | "score_funding" | "score_timing" | "score_margin" | "score_water_stress">, w = WEIGHTS) {
  const s = (v?: number) => v ?? 3;
  return Math.round((s(d.score_reuse_impact) * w.reuse_impact + s(d.score_offtaker) * w.offtaker + s(d.score_funding) * w.funding +
    s(d.score_timing) * w.timing + s(d.score_margin) * w.margin + s(d.score_water_stress) * w.water_stress) * 20 * 10) / 10;
}

export const STAGE_LABELS: Record<Stage, string> = {
  signal: "Signal", planning: "Planning", study: "Study", tender_open: "Tender open", tender_closed: "Tender closed",
  awarded: "Awarded", in_execution: "In execution", operating: "Operating",
};
export const KIND_LABELS: Record<Kind, string> = {
  tender: "Public tender", programme: "Programme", project: "Project", private_opportunity: "Private opportunity", market_signal: "Market signal",
};
export const SCOPE_LABELS: Record<Scope, string> = {
  regeneration_plant: "Regeneration plant", tertiary_upgrade: "Tertiary upgrade", plant_expansion: "Plant expansion",
  reuse_network: "Reuse pipes / network", industrial_supply: "Industrial supply", o_and_m: "Operation & maintenance",
  engineering_study: "Engineering / study", consulting: "Consulting",
};
export const SECTOR_LABELS: Record<Sector, string> = {
  agriculture: "Agriculture", municipal_green: "Parks & municipal", industry_chemical: "Chemicals", industry_manufacturing: "Manufacturing",
  data_centre: "Data centres", hydrogen: "Hydrogen", golf_tourism: "Golf & tourism", airport: "Airports",
  aquifer_recharge: "Aquifer recharge", indirect_potable: "Indirect potable", environmental: "Environmental",
};

// URL-serialisable filter state (?region=Andalucía,Cataluña&min_score=70&actionable=1 …)
export interface DealFilters {
  q?: string;
  region?: string[];
  nuts3?: string[];
  kind?: Kind[];
  stage?: Stage[];
  scope?: Scope[];
  sector?: Sector[];
  value_band?: ValueBand[];
  min_value?: number;
  max_value?: number;
  min_score?: number;
  actionable?: boolean; // default true
  deadline_within_days?: number;
  verified_only?: boolean;
}

export function filterDeals(deals: Deal[], f: DealFilters, today = new Date()): Deal[] {
  const inList = <T,>(list: T[] | undefined, v: T) => !list?.length || list.includes(v);
  const overlaps = <T,>(list: T[] | undefined, vs: T[]) => !list?.length || vs.some((v) => list.includes(v));
  const q = f.q?.toLowerCase().trim();
  return deals.filter((d) => {
    if (q && ![d.name, d.buyer, d.offtakers, d.municipality, d.notes].join(" ").toLowerCase().includes(q)) return false;
    if (!inList(f.region, d.region) || !inList(f.nuts3, d.nuts3 ?? "") || !inList(f.kind, d.kind) || !inList(f.stage, d.stage)) return false;
    if (!overlaps(f.scope, d.scope) || !overlaps(f.sector, d.offtaker_sectors) || !inList(f.value_band, d.value_band)) return false;
    if (f.min_value != null && (d.value_eur ?? -1) < f.min_value) return false;
    if (f.max_value != null && d.value_eur != null && d.value_eur > f.max_value) return false;
    if (f.min_score != null && d.opportunity_score < f.min_score) return false;
    if ((f.actionable ?? true) && !d.is_actionable) return false;
    if (f.verified_only && d.verification_status !== "verified") return false;
    if (f.deadline_within_days != null) {
      if (!d.deadline) return false;
      const days = (new Date(d.deadline).getTime() - today.getTime()) / 86_400_000;
      if (days < 0 || days > f.deadline_within_days) return false;
    }
    return true;
  });
}

// Fields a visitor without a Deal Flow plan may see (mirror of the deals_teaser view)
export function toTeaser(d: Deal) {
  const open = d.access_tier === "free";
  return {
    id: d.id, name: d.name, kind: d.kind, stage: d.stage, region: d.region, province: d.province, nuts3: d.nuts3,
    municipality: d.municipality, lat: d.lat, lng: d.lng, scope: d.scope, value_band: d.value_band, deadline: d.deadline,
    is_actionable: d.is_actionable, access_tier: d.access_tier,
    value_eur: open ? d.value_eur : null, buyer: open ? d.buyer : null, locked: !open,
  };
}

export const formatEur = (v: number | null) =>
  v == null ? "-" : v >= 1e9 ? `€${(v / 1e9).toFixed(1)}bn` : v >= 1e6 ? `€${(v / 1e6).toFixed(1)}M` : `€${Math.round(v / 1e3)}k`;
