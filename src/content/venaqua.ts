// Single source of truth for Venaqua marketing content.
// Pricing, Platform and the homepage must read from here so they never contradict each other.

export type ModuleStatus = "live" | "beta" | "on-request" | "coming";
export type Pillar = "source" | "risk" | "proof";

export type EnquiryTopic = "deal_flow_pro" | "deal_flow_team" | "investment_case" | "data_export" | "data_api";

export type OfferTier = {
  id: EnquiryTopic;
  name: string;
  price: string;
  /** Struck-through list price when a launch price applies. */
  listPrice?: string;
  chip?: string;
  detail: string;
  includes: string[];
  status: ModuleStatus;
  statusLabel: string;
  cta: string;
};

export type Offer = {
  id: "deal-flow" | "data";
  name: string;
  line: string;
  for: string;
  tiers: OfferTier[];
  addon?: { id: EnquiryTopic; name: string; price: string; text: string; cta: string };
  note?: string;
};

// Two paid offers plus a free map. Every price stays under Spain's €15,000 minor-contract limit (excl. VAT).
export const OFFERS: Offer[] = [
  {
    id: "deal-flow",
    name: "Deal Flow",
    line: "Every wastewater-reuse deal in Spain — from first signal to tender — with the analysis to decide which to pursue.",
    for: "Water operators, construction and engineering firms, equipment suppliers, investors.",
    tiers: [
      {
        id: "deal_flow_pro", name: "Pro", price: "€2,900/year", listPrice: "€4,900/year", chip: "Launch price",
        detail: "Launch price for the first 20 customers · 3 seats · Spain",
        includes: [
          "Full deal pipeline with filters: region, value, stage, type, score, deadline",
          "Opportunity analysis on every site: three options, cost of waiting, 2050 scenarios",
          "Automated Investment Case export per deal: supply, demand, pipe and cost ranges, water price, payback, funding options, sources",
          "Saved searches and email alerts",
          "CSV export",
        ],
        status: "beta", statusLabel: "Beta", cta: "Start with the launch price",
      },
      {
        id: "deal_flow_team", name: "Team", price: "€12,000/year",
        detail: "10 seats · everything in Pro",
        includes: ["Shared team pipeline", "CRM export", "1 engineer-reviewed Investment Case per year included"],
        status: "beta", statusLabel: "Beta", cta: "Talk to us",
      },
    ],
    addon: { id: "investment_case", name: "Engineer-reviewed Investment Case", price: "€4,900 fixed per deal", text: "Reviewed by partner engineers; the fee can be split between the parties.", cta: "Request an Investment Case" },
    note: "Beta: some pipeline features, such as alerts and CRM export, are rolled out during the beta.",
  },
  {
    id: "data",
    name: "Data",
    line: "The same structured reuse data — plants, industrial users, deals and scores — in your own tools.",
    for: "Large operators' planning teams, consultancies with their own GIS, water-risk platforms, lenders.",
    tiers: [
      {
        id: "data_export", name: "Export", price: "€6,000/year", detail: "Per country · quarterly files",
        includes: ["CSV and GeoJSON: treatment plants", "Industrial facilities with demand estimates", "Deals with scores and sources"],
        status: "on-request", statusLabel: "Live (on request)", cta: "Request a sample file",
      },
      {
        id: "data_api", name: "API", price: "€14,900/year", detail: "Per country · daily updates",
        includes: ["Daily-updated deals and plant data by API", "API keys", "Field documentation"],
        status: "beta", statusLabel: "Early access", cta: "Request early access",
      },
    ],
    note: "Each layer keeps its source licence and labels (measured, estimate, needs confirmation). Extra country: same price per country.",
  },
];

export const ENQUIRIES: Record<EnquiryTopic, { title: string; description: string; placeholder: string }> = {
  deal_flow_pro: { title: "Deal Flow Pro — launch price", description: "Tell us about your team and the deals you want to track. Launch price €2,900/year for the first 20 customers.", placeholder: "Your company, regions and the kinds of reuse deals you pursue…" },
  deal_flow_team: { title: "Deal Flow Team", description: "Tell us about your team and how you work your pipeline today.", placeholder: "Team size, regions, CRM you use and deals you're working on…" },
  investment_case: { title: "Engineer-reviewed Investment Case", description: "€4,900 fixed per deal, reviewed by partner engineers.", placeholder: "The deal or site, the parties involved and the decision you need to make…" },
  data_export: { title: "Request a sample data file", description: "Quarterly CSV and GeoJSON per country, €6,000/year.", placeholder: "Countries, layers you need and the tools you'll load them into…" },
  data_api: { title: "Data API early access", description: "Daily-updated deals and plant data per country, €14,900/year.", placeholder: "Countries, endpoints you need and your integration…" },
};

export const PRICING_STORY = {
  title: "Pricing",
  description: "Two ways to use Venaqua: work the deals, or take the data. Flat prices, no success fees.",
  small: "EUR, excluding VAT. All prices are under Spain's €15,000 minor-contract limit, so public bodies can buy directly.",
  free: "Free: the reuse map, plant pages and the list of public reuse tenders. No account needed.",
  summary: "Free map · Deal Flow from €2,900/yr · Data from €6,000/yr",
  which: [
    { want: "I want to find and win reuse projects", offer: "Deal Flow" },
    { want: "I want the data in my own systems", offer: "Data" },
  ],
  why: [
    "Tender alerts cost €200–3,500 a year and start when a tender is published. Deal Flow starts at the plant, months earlier, and includes the analysis.",
    "A feasibility study can cost €150–300k. An engineer-reviewed Investment Case is €4,900.",
    "We never take a cut of a deal, so our numbers stay neutral.",
  ],
};

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
  { q: "What's in an Investment Case?", a: "Supply, demand, pipe and cost ranges, the water price, payback, funding options and every source used. Deal Flow plans export it automatically for each deal. The engineer-reviewed version (€4,900 fixed per deal) adds a check by partner engineers." },
  { q: "Is it engineering advice?", a: "No. Investment Cases are indicative screening documents that help you decide whether a full engineering study is worth commissioning. They do not replace engineering design, legal advice or permitting review." },
  { q: "Can public bodies buy without a tender?", a: "Yes. Every price is under Spain's €15,000 minor-contract limit (excluding VAT), so agencies and municipal water companies can buy directly." },
  { q: "Do you take a commission?", a: "No. Flat subscriptions and fixed fees only — no success fees, no commissions, no paid ranking. We never earn more when a deal happens." },
  { q: "What's the difference between Deal Flow and Data?", a: "Deal Flow is the deal pipeline plus the analysis, used inside Venaqua to find and win projects. Data is the same structured data delivered to your own tools by file export or API." },
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
  { icon: "operators", title: "Water operators, EPC firms and equipment suppliers", text: "See reuse projects before they're tendered.", access: "Deal Flow from €2,900 (launch)" },
  { icon: "owners", title: "Plant owners: municipal water companies, consortia, regional agencies", text: "Plan the upgrades that make reuse possible.", access: "Free map · Investment Case €4,900" },
  { icon: "industry", title: "Industrial sites and parks", text: "Find out if reclaimed water can replace what you buy today.", access: "Free map · Investment Case €4,900" },
  { icon: "investors", title: "Investors and lenders", text: "Get a neutral, costed case for each project.", access: "Deal Flow or an Investment Case €4,900" },
];

/** Label for any sample / demo record shown on the site. */
export const SAMPLE_LABEL = "Sample — illustrative";

