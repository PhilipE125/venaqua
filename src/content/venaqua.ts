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
  slug: "deal-file" | "deal-flow" | "data-api";
};

// Max three paid options: two deal-flow products and one data product. The free map is a footnote, not a plan.
export const PLANS: Plan[] = [
  {
    name: "Deal File",
    slug: "deal-file",
    price: "Scoped per project",
    for: "Teams that need one opportunity worked up for an internal or investor decision",
    features: [
      "Indicative feasibility pack for one opportunity",
      "Supply, demand, route and economics ranges",
      "Drought-cost and payback scenarios",
      "Open questions for engineering review",
      "Not an engineering design",
    ],
    cta: "Request a Deal File",
    topic: "Deal File request",
  },
  {
    name: "Deal Flow",
    slug: "deal-flow",
    price: "From €12,000/year",
    for: "Advisors, developers and engineering teams sourcing and qualifying reuse opportunities",
    features: [
      "Market Access — one market, up to 10 active opportunities (from €12,000/year)",
      "Development Portfolio — reuse pipeline, up to 25 opportunities, alerts (€30,000–45,000/year)",
      "Full opportunity cards and economics",
      "Project stages, owners and evidence logs",
      "Professional decision briefs",
    ],
    cta: "Book a demo",
    topic: "Booking a demo — Deal Flow",
    popular: true,
  },
  {
    name: "Data & API",
    slug: "data-api",
    price: "€60,000–100,000/year",
    for: "Operators, agencies and platforms plugging Venaqua data into their own tools",
    features: [
      "Normalised plant, demand and stress layers",
      "Export and API access",
      "Private data layers and custom scoring",
      "Enterprise: multi-region, SSO and integrations — custom pricing",
    ],
    cta: "Talk to the team",
    topic: "Data / API enquiry",
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
  { q: "Why is there no online checkout?", a: "Paid plans are annual and depend on your market, team size and data needs. Every plan starts with a short conversation so we can scope it properly and show the workspace on your own sites. Implementation and private-data setup are scoped separately and agreed in writing before work starts." },
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

// Detail pages for the three pricing options (/solutions/$slug).
export type SolutionSlug = "deal-file" | "deal-flow" | "data-api";
export type Solution = {
  slug: SolutionSlug;
  name: string;
  price: string;
  tagline: string;
  intro: string;
  who: string[];
  includes: { title: string; text: string }[];
  tiers?: { name: string; price: string; text: string }[];
  steps: { title: string; text: string }[];
  limits: string[];
  cta: string;
  topic: string;
};

export const SOLUTIONS: Solution[] = [
  {
    slug: "deal-file",
    name: "Deal File",
    price: "Scoped per project",
    tagline: "One reuse opportunity, worked up for a decision.",
    intro: "A Deal File takes a single opportunity — a treatment plant and the companies around it — and puts the supply, demand, route and money questions into one indicative pack your team or investors can discuss.",
    who: ["Industrial sites weighing reclaimed water against tariffs or drought risk", "Developers preparing an internal go / no-go", "Advisors who need a neutral first view for a client"],
    includes: [
      { title: "Supply and demand", text: "Plant capacity, treatment level and estimated demand of nearby users, each with its evidence label." },
      { title: "Route and cost ranges", text: "Indicative pipe distance and capital / operating cost ranges for the main water options." },
      { title: "Drought exposure and payback", text: "Restriction scenarios based on real Spanish drought rules, with avoided-cost and payback ranges." },
      { title: "Open questions", text: "What an engineer, the plant operator and the water authority still need to confirm." },
    ],
    steps: [
      { title: "Scope call", text: "We agree the site, the question and the timeline." },
      { title: "Analysis", text: "We assemble public data, your inputs and our models." },
      { title: "Review", text: "We walk you through the file and the assumptions behind it." },
    ],
    limits: ["Indicative screening, not an engineering design", "Figures are ranges, not quotes or guaranteed returns"],
    cta: "Request a Deal File",
    topic: "Deal File request",
  },
  {
    slug: "deal-flow",
    name: "Deal Flow",
    price: "From €12,000/year",
    tagline: "A steady pipeline of qualified water-reuse opportunities.",
    intro: "Deal Flow is the full Venaqua workspace: find opportunities on the map, qualify them with economics and evidence, and move them through your own project pipeline.",
    who: ["Engineering and water-services firms looking for projects", "Developers building a reuse portfolio", "Advisors tracking several clients or markets"],
    tiers: [
      { name: "Market Access", price: "From €12,000/year", text: "One market, up to 10 active opportunities." },
      { name: "Development Portfolio", price: "€30,000–45,000/year", text: "Reuse pipeline with up to 25 opportunities and alerts." },
    ],
    includes: [
      { title: "Full opportunity cards", text: "Plant, company and stress details with indicative economics for every match." },
      { title: "Project workspace", text: "Private projects with stages, owners and an evidence log." },
      { title: "Decision briefs", text: "Exportable briefs that separate screening from engineer review." },
      { title: "Scenario tools", text: "Drought-cost and reuse-investment comparisons you can edit." },
    ],
    steps: [
      { title: "Demo", text: "We show the workspace on your market." },
      { title: "Pick a tier", text: "Market Access or Development Portfolio." },
      { title: "Onboarding", text: "We set up your markets and first opportunities." },
    ],
    limits: ["Coverage follows available public data per market", "Economics are indicative until engineer-reviewed"],
    cta: "Book a demo",
    topic: "Booking a demo — Deal Flow",
  },
  {
    slug: "data-api",
    name: "Data & API",
    price: "€60,000–100,000/year",
    tagline: "Venaqua's water data inside your own tools.",
    intro: "Data & API gives your team the normalised layers behind the map — treatment plants, industrial demand and water stress — through exports or an API.",
    who: ["Water operators and public agencies", "Lenders, insurers and risk teams", "Platforms adding water data to their products"],
    includes: [
      { title: "Normalised layers", text: "Plants, demand signals and stress indicators in one consistent format, with source and quality notes." },
      { title: "Export and API", text: "Bulk exports or programmatic access for your own systems." },
      { title: "Private layers", text: "Your own asset and demand data combined with ours." },
      { title: "Custom scoring", text: "Opportunity scoring tuned to your criteria." },
    ],
    tiers: [
      { name: "Data & API", price: "€60,000–100,000/year", text: "Depending on regions, layers and usage." },
      { name: "Enterprise", price: "Custom pricing", text: "Multi-region, SSO and integrations." },
    ],
    steps: [
      { title: "Discovery", text: "We map the layers and regions you need." },
      { title: "Trial", text: "Sample export to test with your tools." },
      { title: "Agreement", text: "Annual licence and access set up." },
    ],
    limits: ["Each layer keeps its original source licence and attribution", "Modelled and estimated values stay labelled as such"],
    cta: "Talk to the team",
    topic: "Data / API enquiry",
  },
];
