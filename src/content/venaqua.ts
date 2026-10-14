// Single source of truth for Venaqua marketing content.
// Pricing, Platform and the homepage must read from here so they never contradict each other.

export type ModuleStatus = "live" | "beta" | "on-request" | "coming";
export type Pillar = "source" | "risk" | "proof";

export type Plan = {
  name: string;
  family: string;
  outcome: string;
  price: string;
  for: string;
  features: string[];
  cta: string;
  href?: "/explore";
  topic?: string;
  popular?: boolean;
  tiers?: { name: string; price: string; text: string }[];
  note: string;
  enquiry: { title: string; description: string; placeholder: string };
};

// Max three paid options: two deal-flow products and one data product. The free map is a footnote, not a plan.
export const PLANS: Plan[] = [
  {
    name: "Deal File",
    family: "Reuse projects",
    outcome: "Make a decision on one opportunity.",
    price: "Scoped per project",
    for: "For project teams, investors and lenders evaluating a specific site.",
    features: [
      "Supply and demand assessment with source evidence",
      "Indicative connection and treatment cost ranges",
      "Drought exposure, reuse savings and payback scenarios",
      "Downloadable decision brief and engineering questions",
    ],
    cta: "Scope my Deal File",
    topic: "Deal File request",
    note: "An indicative project assessment, not engineering design. Scope and fee agreed before work starts.",
    enquiry: { title: "Scope your Deal File", description: "Tell us about one opportunity and the decision you need to make. We’ll discuss scope and pricing.", placeholder: "Site or opportunity, available water data, and the decision you need to make…" },
  },
  {
    name: "Deal Flow",
    family: "Reuse projects",
    outcome: "Find, qualify and progress a portfolio.",
    price: "From €12,000/year",
    for: "For operators, developers, EPC firms and advisors building a reuse pipeline.",
    features: [
      "Map-based supply–demand matching and opportunity analysis",
      "Compare economics and drought-resilience scenarios",
      "Private pipeline with stages, owners and evidence logs",
      "Export decision briefs for project review",
    ],
    tiers: [
      { name: "Market Access", price: "From €12,000/year", text: "One market · up to 10 active projects" },
      { name: "Development Portfolio", price: "€30,000–45,000/year", text: "Up to 25 active projects · in-app project alerts" },
    ],
    cta: "Book a Deal Flow demo",
    topic: "Booking a demo — Deal Flow",
    popular: true,
    note: "Deal File adds a scoped assessment when a shortlisted opportunity needs a deeper decision case.",
    enquiry: { title: "Book your Deal Flow demo", description: "See how Venaqua can support your reuse pipeline. Tell us your market and portfolio needs.", placeholder: "Your market, the opportunities you work on, and approximate portfolio size…" },
  },
  {
    name: "Data & API",
    family: "Data access",
    outcome: "Bring reuse intelligence into your tools.",
    price: "€60,000–100,000/year",
    for: "For operators, agencies and platforms using their own GIS or analysis tools.",
    features: [
      "API access to plant data, your projects and private sites",
      "CSV and GeoJSON exports of map data and opportunities",
      "Upload private supply and demand sites",
      "Custom map-scoring weights and revocable API keys",
    ],
    cta: "Discuss API access",
    topic: "Data / API enquiry",
    note: "Coverage and integration scope agreed with your team. Demand and stress data are export-only, not API endpoints.",
    enquiry: { title: "Discuss your data needs", description: "Tell us which datasets and tools you need to connect. We’ll confirm coverage, API scope and pricing.", placeholder: "Datasets, regions, intended tools, and export or API requirements…" },
  },
];

export const PRICING_STORY = {
  title: "Reuse projects. Connected data.",
  description: "One reuse-project solution, two ways to use it: assess a single opportunity with Deal File, or develop a portfolio with Deal Flow. Need data in your own tools? Choose Data & API.",
  pipelineNote: "Next for Deal Flow: a sourced reuse-deal feed with shared filters, deadline tracking and human-reviewed updates. These additions are planned, not included as live features today.",
};

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
    text: "API access to plants, your projects and private sites; map-data exports for your own tools. Coverage is scoped with your team.",
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
  reuseShare: { id: "reuseShare", value: "14.5%", label: "Treated wastewater reused in Spain", source: "INE", year: "2024" },
  industryShare: { id: "industryShare", value: "4.4%", label: "Share of reused water that goes to industry", source: "INE", year: "2024" },
  tertiary: { id: "tertiary", value: "~25%", label: "Spanish plants above 2,000 p.e. with tertiary treatment", source: "MITECO", year: "2022" },
  madridRelease: { id: "madridRelease", value: "91.5 hm³", label: "Reclaimed water Madrid's Canal de Isabel II released to rivers", source: "Canal de Isabel II", year: "2023" },
  reclaimedCost: { id: "reclaimedCost", value: "€0.10–0.19/m³", label: "Cost to produce reclaimed water", source: "Sector benchmarks" },
  desalCost: { id: "desalCost", value: "€0.5–1.0/m³", label: "Typical cost of desalinated water", source: "Sector benchmarks" },
  bcnTariff: { id: "bcnTariff", value: "€1.73–2.59/m³", label: "Industrial mains water tariff, Barcelona area", source: "Tariff schedules", year: "2024" },
  pipelineCost: { id: "pipelineCost", value: "€0.35–0.85M per km", label: "Indicative reclaimed-water pipeline cost", source: "Literature benchmarks" },
  tarragona: { id: "tarragona", value: "17 km, ~6 hm³/yr since 2012", label: "Tarragona: treated wastewater to the chemical cluster; ~€42M, 85% EU Cohesion Fund", source: "ACA / AITASA" },
  uwwtd2039: { id: "uwwtd2039", value: "2039", label: "Deadline for extra treatment at plants ≥150,000 p.e.", source: "Directive (EU) 2024/3019", url: "https://eur-lex.europa.eu/eli/dir/2024/3019/oj" },
  authorisation: { id: "authorisation", value: "12 months", label: "Decision period for a reuse authorisation; silence means refusal", source: "Real Decreto 1085/2024" },
  energyAvoided: { id: "energyAvoided", value: "~2–3 GWh", label: "Electricity saved per hm³ of reuse that replaces desalination", source: "Venaqua estimate", estimate: true },
} satisfies Record<string, Fact>;

export type FactId = keyof typeof FACTS;

export const FAQ_PRICING = [
  { q: "Is the map really free?", a: "Yes. The Free Explorer map needs no account and no card. You can search plants, industrial users and water-stress layers across Spain and open compact previews. Paid plans add full economics, saved projects, team workspaces and briefs. You can stay on the free map as long as you like." },
  { q: "How do Deal File and Deal Flow fit together?", a: "They are two ways to develop reuse projects. Deal File focuses on one opportunity and a specific decision. Deal Flow provides an ongoing workspace to find, qualify and track a portfolio. You can request a scoped Deal File for a shortlisted project; it is not automatically included in the subscription." },
  { q: "Why is there no online checkout?", a: "Deal Flow and Data & API are annual subscriptions. Deal File is scoped and priced per project. Each starts with a product-specific enquiry so we can confirm your needs, coverage and fee. Implementation and private-data setup are agreed separately before work starts." },
  { q: "Does Venaqua take a cut of the projects?", a: "No. Venaqua charges only for software and data. We take no success fees or commissions, sell no exclusive leads and accept no paid ranking. That keeps the rankings and economics neutral, so you can share them with partners, boards and lenders without a conflict of interest." },
  { q: "Is a brief an engineering study?", a: "No. Briefs and Deal Files are indicative screening documents. They show supply, demand, route and cost ranges with sources and open questions. They help you decide whether an engineering study is worth commissioning. They do not replace engineering design, legal advice or permitting review." },
];

export const FAQ_PLATFORM = [
  { q: "Where does the data come from?", a: "Venaqua combines public European and Spanish sources: EEA treatment-plant reports, industrial emissions registers, Catalan water agency data, reservoir levels and public tenders. Every figure is labelled measured, modelled or estimated, with its source and date, so you always know how far to trust it before you act on it." },
  { q: "Which regions are covered?", a: "Spain is covered with national public data, and Catalonia has a richer local overlay with regeneration plants and reuse volumes. Outside Catalonia, reuse data is sparse, so matches are labelled as potential. More European regions will follow, using the same EU-wide sources as the national base." },
  { q: "What do the status badges mean?", a: "Live means the module is in the product today. Beta means it works but is still changing. On request means we set it up for your team. Coming soon means it is planned and not yet available. We use these labels so we never claim more than the product does." },
];

export const NEUTRALITY = [
  { title: "No success fees", text: "No success fees or commissions — we earn the same whether a project goes ahead or who wins it." },
  { title: "Same data for everyone", text: "Same data for every subscriber at a tier — no exclusive leads, no paid ranking." },
  { title: "Consent first", text: "Private needs are shared only with the owner's consent." },
];

export const VISION = {
  mission: "Optimise wastewater reuse — so treated water replaces freshwater instead of being discharged.",
  headline: "Optimise wastewater reuse.",
  subheadline: "So treated water replaces freshwater instead of being discharged.",
  description: "Venaqua shows where treated wastewater could be reused, who could use it, what the pipe and treatment upgrade would cost, and how to fund it — then tracks each project from first signal to delivery.",
  pitch: "Spain reuses only 14.5% of its treated wastewater. Venaqua finds the reuse projects worth building — and makes them bankable.",
  impact: "We measure verified m³ of freshwater replaced by reused water — counted only when it is additional, permitted and backed by meter data.",
  tagline: "Every industrial m³ — mapped, priced and proven.",
  questions: [
    { pillar: "source" as Pillar, label: "Source", question: "Where does this site's water come from, and what are the alternatives?", status: "live" as ModuleStatus, note: "Live today" },
    { pillar: "risk" as Pillar, label: "Risk", question: "What will it cost and risk by 2035?", status: "beta" as ModuleStatus, note: "Live for sites; data product for lenders and insurers coming" },
    { pillar: "proof" as Pillar, label: "Proof", question: "What can it prove it saved, to auditors and banks?", status: "coming" as ModuleStatus, note: "Verified Water Ledger, coming" },
  ],
};

export type AudienceIcon = "operators" | "owners" | "industry" | "investors";
export const AUDIENCES: { icon: AudienceIcon; title: string; text: string; access: string }[] = [
  { icon: "operators", title: "Water operators, EPC firms and equipment suppliers", text: "See reuse projects before they're tendered.", access: "Paid plans" },
  { icon: "owners", title: "Plant owners: municipal water companies, consortia, regional agencies", text: "Plan the upgrades that make reuse possible.", access: "Free · paid workspace optional" },
  { icon: "industry", title: "Industrial sites and parks", text: "Find out if reclaimed water can replace what you buy today.", access: "Free" },
  { icon: "investors", title: "Investors and lenders", text: "Get a neutral, costed case for each project.", access: "Paid per case" },
];

/** Label for any sample / demo record shown on the site. */
export const SAMPLE_LABEL = "Sample — illustrative";

