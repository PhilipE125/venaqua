// Single source of truth for Venaqua marketing content.
// Pricing, Platform and the homepage must read from here so they never contradict each other.

export type ModuleStatus = "live" | "beta" | "on-request" | "coming";
export type Pillar = "source" | "risk" | "proof";

export type Plan = {
  name: string;
  price: string;
  for: string;
  features: string[];
  cta: string;
  href?: "/explore";
  topic?: string;
  popular?: boolean;
};

export const PLANS: Plan[] = [
  {
    name: "Free Explorer",
    price: "Free",
    for: "Anyone exploring water-reuse opportunities",
    features: ["Public map", "Basic filters", "Compact public opportunity previews", "Water-stress and source visibility"],
    cta: "Explore the map",
    href: "/explore",
  },
  {
    name: "Market Access",
    price: "From €12,000/year",
    for: "Advisors and developers screening opportunities in one market",
    features: ["Advanced reuse searches", "Saved searches", "Full opportunity cards", "Up to 10 active opportunities", "Standard analysis briefs", "Basic team workspace"],
    cta: "Book a demo",
    topic: "Booking a demo — Market Access",
  },
  {
    name: "Development Portfolio",
    price: "€30,000–45,000/year",
    popular: true,
    for: "Engineering teams, operators and industrial associations managing a development pipeline",
    features: ["Everything in Market Access", "Reuse pipeline workspace", "Up to 25 active opportunities", "Project stages, owners, tasks and evidence logs", "Tender, permit, drought and data-change alerts", "Comparable-project intelligence", "Professional decision briefs"],
    cta: "Talk to the team",
    topic: "Talk to the team — Development Portfolio",
  },
  {
    name: "Asset Intelligence",
    price: "€60,000–100,000/year",
    for: "Operators and planning teams managing private asset and demand data",
    features: ["Everything in Development Portfolio", "Portfolio dashboard", "Private data layers", "Custom scoring", "Controlled project rooms", "API and export options"],
    cta: "Design your workspace",
    topic: "Design your workspace — Asset Intelligence",
  },
  {
    name: "Enterprise",
    price: "Custom",
    for: "Multi-region operators, agencies and infrastructure teams",
    features: ["Multi-region access", "Integrations", "SSO", "Security and governance", "Custom data products"],
    cta: "Contact Venaqua",
    topic: "Enterprise enquiry",
  },
];

export const ADDONS = [
  {
    name: "Deal File",
    price: "Scoped per project",
    status: "on-request" as ModuleStatus,
    text: "An indicative feasibility pack for one opportunity: supply, demand, route, economics ranges and open questions. Not an engineering design.",
    topic: "Deal File request",
  },
  {
    name: "Data / API",
    price: "On request",
    status: "on-request" as ModuleStatus,
    text: "Export or API access to Venaqua's normalised plant, demand and stress layers for your own tools.",
    topic: "Data / API enquiry",
  },
];

export type Module = { name: string; text: string; status: ModuleStatus; pillar: Pillar };

export const MODULES: Module[] = [
  { name: "Searchable Spain and Catalonia map", text: "Plants, industrial users and stress layers on one map.", status: "live", pillar: "source" },
  { name: "Treatment and water recycling plants", text: "Capacity, treatment level and reported reuse.", status: "live", pillar: "source" },
  { name: "Company and demand signals", text: "Industrial facilities with estimated water demand.", status: "live", pillar: "source" },
  { name: "Water-stress layer", text: "Reservoir fill and drought signals.", status: "live", pillar: "risk" },
  { name: "Transparent evidence labels", text: "Measured, modelled or estimated — with the source.", status: "live", pillar: "source" },
  { name: "Opportunity analysis", text: "Indicative economics and cost scenarios per site.", status: "beta", pillar: "risk" },
  { name: "Project workspace", text: "Private pipeline with stages, owners and evidence.", status: "beta", pillar: "source" },
  { name: "Feasibility brief export", text: "Indicative brief, clearly not engineer-reviewed.", status: "beta", pillar: "proof" },
  { name: "Private data layers and API", text: "Your own asset and demand data in the workspace.", status: "on-request", pillar: "source" },
  { name: "Risk data product for lenders and insurers", text: "Site-level water cost and risk to 2035.", status: "coming", pillar: "risk" },
  { name: "Verified Water Ledger", text: "Savings records that auditors and banks can check.", status: "coming", pillar: "proof" },
];

export type Fact = { id: string; value: string; label: string; source: string; year?: string; url?: string; estimate?: boolean };

export const FACTS = {
  reuseShare: { id: "reuseShare", value: "14.5%", label: "Share of treated wastewater reused in Spain (907 of 6,271 hm³)", source: "INE", year: "2024" },
  industryShare: { id: "industryShare", value: "4.4%", label: "Share of reused water that goes to industry", source: "INE", year: "2024" },
  madridRelease: { id: "madridRelease", value: "91.5 hm³", label: "Reclaimed water Madrid's Canal de Isabel II released to rivers", source: "Canal de Isabel II", year: "2023" },
  reclaimedCost: { id: "reclaimedCost", value: "€0.10–0.19/m³", label: "Typical cost to produce reclaimed water", source: "Sector benchmarks" },
  desalCost: { id: "desalCost", value: "€0.5–1.0/m³", label: "Typical cost of desalinated water", source: "Sector benchmarks" },
  bcnTariff: { id: "bcnTariff", value: "€1.73–2.59/m³", label: "Barcelona-area industrial water tariff range", source: "Tariff schedules", year: "2024" },
  pipelineCost: { id: "pipelineCost", value: "€0.35–0.85M per km", label: "Indicative reclaimed-water pipeline cost", source: "Literature benchmarks" },
  tarragona: { id: "tarragona", value: "17 km, ~6 hm³/yr since 2012", label: "Tarragona: treated wastewater to the chemical cluster; ~€42M, 85% EU Cohesion Fund", source: "ACA / AITASA" },
  uwwtd2039: { id: "uwwtd2039", value: "2039", label: "Deadline for extra nitrogen and phosphorus removal at plants ≥150,000 p.e.", source: "Directive (EU) 2024/3019", url: "https://eur-lex.europa.eu/eli/dir/2024/3019/oj" },
  authorisation: { id: "authorisation", value: "12 months", label: "Decision period for a reuse authorisation; silence means refusal", source: "Real Decreto 1085/2024" },
  energyAvoided: { id: "energyAvoided", value: "~2–3 GWh", label: "Electricity avoided per hm³ when reclaimed water replaces desalination", source: "Venaqua estimate", estimate: true },
} satisfies Record<string, Fact>;

export type FactId = keyof typeof FACTS;

export const FAQ_PRICING = [
  { q: "Is the map really free?", a: "Yes. The Free Explorer map needs no account and no card. You can search plants, industrial users and water-stress layers across Spain and open compact previews. Paid plans add full economics, saved projects, team workspaces and briefs. You can stay on the free map as long as you like." },
  { q: "Why is there no online checkout?", a: "Paid plans are annual and depend on your market, team size and data needs. Every plan starts with a short conversation so we can scope it properly and show the workspace on your own sites. Implementation and private-data setup are scoped separately and agreed in writing before work starts." },
  { q: "Does Venaqua take a cut of the projects?", a: "No. Venaqua charges only for software and data. We take no success fees, no referral fees and no paid placement from utilities, suppliers or contractors. That keeps the rankings and economics neutral, so you can share them with partners, boards and lenders without a conflict of interest." },
  { q: "Is a brief an engineering study?", a: "No. Briefs and Deal Files are indicative screening documents. They show supply, demand, route and cost ranges with sources and open questions. They help you decide whether an engineering study is worth commissioning. They do not replace engineering design, legal advice or permitting review." },
];

export const FAQ_PLATFORM = [
  { q: "Where does the data come from?", a: "Venaqua combines public European and Spanish sources: EEA treatment-plant reports, industrial emissions registers, Catalan water agency data, reservoir levels and public tenders. Every figure is labelled measured, modelled or estimated, with its source and date, so you always know how far to trust it before you act on it." },
  { q: "Which regions are covered?", a: "Spain is covered with national public data, and Catalonia has a richer local overlay with regeneration plants and reuse volumes. Outside Catalonia, reuse data is sparse, so matches are labelled as potential. More European regions will follow, using the same EU-wide sources as the national base." },
  { q: "What do the status badges mean?", a: "Live means the module is in the product today. Beta means it works but is still changing. On request means we set it up for your team. Coming soon means it is planned and not yet available. We use these labels so we never claim more than the product does." },
];

export const NEUTRALITY = [
  { title: "No success fees", text: "We are paid for software and data, never a share of a project." },
  { title: "No referral fees", text: "We take nothing from suppliers, contractors or utilities for introductions." },
  { title: "No paid placement", text: "Nobody can pay to rank higher on the map or in an analysis." },
];

export const VISION = {
  mission: "Venaqua is building the neutral system of record for industrial water.",
  tagline: "Every industrial m³ — mapped, priced and proven.",
  questions: [
    { pillar: "source" as Pillar, label: "Source", question: "Where does this site's water come from, and what are the alternatives?", status: "live" as ModuleStatus, note: "Live today" },
    { pillar: "risk" as Pillar, label: "Risk", question: "What will it cost and risk by 2035?", status: "beta" as ModuleStatus, note: "Live for sites; data product for lenders and insurers coming" },
    { pillar: "proof" as Pillar, label: "Proof", question: "What can it prove it saved, to auditors and banks?", status: "coming" as ModuleStatus, note: "Verified Water Ledger, coming" },
  ],
};
