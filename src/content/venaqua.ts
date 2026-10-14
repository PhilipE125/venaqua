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

// One pricing table. Every price stays under Spain's €15,000 minor-contract limit (excl. VAT).
export type Plan = {
  id: EnquiryTopic | "free";
  name: string;
  price: string;
  listPrice?: string;
  priceNote: string;
  includes: string[];
  status: ModuleStatus;
  statusLabel: string;
  cta: "Start pilot" | "Talk to us" | "Open the free map";
};

export const PLANS: Plan[] = [
  { id: "free", name: "Free", price: "€0", priceNote: "No account needed", includes: ["Reuse map and plant pages", "Teaser lists of cases, signals and tenders", "No € figures or buyer names"], status: "live", statusLabel: "Live", cta: "Open the free map" },
  { id: "deal_flow_pro", name: "Deal Flow Pro", price: "€2,900/yr", listPrice: "€4,900/yr", priceNote: "Launch price for the first 20 customers", includes: ["3 seats · Spain", "All investment cases, early signals and tenders", "3 Case Rooms", "Exports and alerts"], status: "beta", statusLabel: "Beta", cta: "Start pilot" },
  { id: "deal_flow_team", name: "Deal Flow Team", price: "€12,000/yr", priceNote: "Everything in Pro", includes: ["10 seats", "Unlimited Case Rooms", "Company profile for eligibility checks", "1 engineer-reviewed case included"], status: "beta", statusLabel: "Beta", cta: "Talk to us" },
  { id: "investment_case", name: "Engineer-reviewed case", price: "from €4,900", priceNote: "Scoped per case", includes: ["A screening case checked by partner engineers", "Fee can be split between the parties"], status: "on-request", statusLabel: "On request", cta: "Talk to us" },
  { id: "data_export", name: "Data (export or API)", price: "from €6,000/yr", priceNote: "Per country", includes: ["Plants, industrial users, cases and tenders", "CSV, GeoJSON or API", "Source and evidence labels kept"], status: "on-request", statusLabel: "On request", cta: "Talk to us" },
];

export const ENQUIRIES: Record<EnquiryTopic, { title: string; description: string; placeholder: string }> = {
  deal_flow_pro: { title: "Start a Deal Flow Pro pilot", description: "Launch price €2,900/yr (excl. VAT) for the first 20 customers.", placeholder: "Your company, regions and the kinds of reuse projects you pursue…" },
  deal_flow_team: { title: "Deal Flow Team", description: "€12,000/yr (excl. VAT) for 10 seats with unlimited Case Rooms.", placeholder: "Team size, regions and the cases you're working on…" },
  investment_case: { title: "Engineer-reviewed case", description: "From €4,900 (excl. VAT), scoped per case.", placeholder: "The case or site, the parties involved and the decision you need to make…" },
  data_export: { title: "Data by export or API", description: "From €6,000/yr per country (excl. VAT).", placeholder: "Countries, layers you need and the tools you'll load them into…" },
  data_api: { title: "Data by export or API", description: "From €6,000/yr per country (excl. VAT).", placeholder: "Countries, endpoints you need and your integration…" },
};

export const PRICING_STORY = {
  title: "Pricing",
  description: "Investment cases, early signals and tenders for water reuse in Spain, or our data in your own tools. Flat prices in EUR, excluding VAT.",
  small: "No success fees or commissions. All prices are under €15,000, so public bodies can buy directly.",
  free: "Free: the reuse map and teaser lists. No account needed.",
  summary: "Free map · Deal Flow from €2,900/yr · Data from €6,000/yr",
  which: [
    { want: "I want to find, shape and win reuse projects", offer: "Deal Flow" },
    { want: "I want the data in my own systems", offer: "Data" },
  ],
  why: [
    "Tender alerts cost €200-3,500 a year and start when a tender is published. Deal Flow starts at the plant, months earlier, with costed co-investment cases.",
    "A feasibility study can cost €150-300k. An engineer-reviewed case starts at €4,900.",
    "We never take a cut of a deal, so our numbers stay neutral.",
  ],
};

export type Module = { name: string; text: string; status: ModuleStatus; pillar: Pillar };

export const MODULES: Module[] = [
  { name: "Searchable Spain and Catalonia map", text: "Plants, industrial users and stress layers on one map.", status: "live", pillar: "source" },
  { name: "Treatment and water recycling plants", text: "Capacity, treatment level and reported reuse.", status: "live", pillar: "source" },
  { name: "Company and demand signals", text: "Industrial facilities with estimated water demand.", status: "live", pillar: "source" },
  { name: "Water-stress layer", text: "Reservoir fill and drought signals.", status: "live", pillar: "risk" },
  { name: "Transparent evidence labels", text: "Each figure is labelled measured, modelled or estimated, with its source.", status: "live", pillar: "source" },
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
  reclaimedCost: { id: "reclaimedCost", value: "€0.10-0.19/m³", label: "Cost to produce reclaimed water", source: "Sector benchmarks" },
  desalCost: { id: "desalCost", value: "€0.5-1.0/m³", label: "Typical cost of desalinated water", source: "Sector benchmarks" },
  bcnTariff: { id: "bcnTariff", value: "€1.73-2.59/m³", label: "Industrial mains water tariff, Barcelona area", source: "Tariff schedules", year: "2024" },
  pipelineCost: { id: "pipelineCost", value: "€0.35-0.85M per km", label: "Indicative reclaimed-water pipeline cost", source: "Literature benchmarks" },
  tarragona: { id: "tarragona", value: "17 km, ~6 hm³/yr since 2012", label: "Tarragona: treated wastewater to the chemical cluster; ~€42M, 85% EU Cohesion Fund", source: "ACA / AITASA" },
  uwwtd2039: { id: "uwwtd2039", value: "2039", label: "Deadline for extra treatment at plants ≥150,000 p.e.", source: "Directive (EU) 2024/3019", url: "https://eur-lex.europa.eu/eli/dir/2024/3019/oj" },
  authorisation: { id: "authorisation", value: "12 months", label: "Decision period for a reuse authorisation; silence means refusal", source: "Real Decreto 1085/2024" },
  energyAvoided: { id: "energyAvoided", value: "~2-3 GWh", label: "Electricity saved per hm³ of reuse that replaces desalination", source: "Venaqua estimate", estimate: true },
} satisfies Record<string, Fact>;

export type FactId = keyof typeof FACTS;

export const FAQ_PRICING = [
  { q: "What's in an investment case?", a: "The parties, shared infrastructure, capex, delivered cost per m³ against today's cost, yearly saving, payback and a verdict. Pro and Team open each one in a Case Room with the permit path, risk-plan checklist, term-sheet draft and funding. The engineer-reviewed version (from €4,900, scoped per case) adds a check by partner engineers." },
  { q: "Is it engineering advice?", a: "No. Cases are estimates from public data and stated assumptions. They help you decide whether a full engineering study is worth commissioning, and do not replace engineering design, legal advice or permitting review." },
  { q: "Can public bodies buy without a tender?", a: "Yes. Every price is under Spain's €15,000 minor-contract limit (excluding VAT), so agencies and municipal water companies can buy directly." },
  { q: "Do you take a commission?", a: "No. We charge flat subscriptions and fixed fees, with no success fees, commissions or paid ranking. Our fee does not change when a deal goes ahead." },
  { q: "What's the difference between Deal Flow and Data?", a: "Deal Flow is the deal pipeline plus the analysis, used inside Venaqua to find and win projects. Data is the same structured data delivered to your own tools by file export or API." },
];

export const FAQ_PLATFORM = [
  { q: "Where does the data come from?", a: "Venaqua combines public European and Spanish sources: EEA treatment-plant reports, industrial emissions registers, Catalan water agency data, reservoir levels and public tenders. Every figure is labelled measured, modelled or estimated, with its source and date, so you always know how far to trust it before you act on it." },
  { q: "Which regions are covered?", a: "Spain is covered with national public data, and Catalonia has a richer local overlay with regeneration plants and reuse volumes. Outside Catalonia, reuse data is sparse, so matches are labelled as potential. More European regions will follow, using the same EU-wide sources as the national base." },
  { q: "What do the status badges mean?", a: "Live means the module is in the product today. Beta means it works but is still changing. On request means we set it up for your team. Coming soon means it is planned and not yet available. We use these labels so we never claim more than the product does." },
];

export const NEUTRALITY = [
  { title: "No success fees", text: "We charge no success fees or commissions. Our fee stays the same regardless of whether a project goes ahead or who wins it." },
  { title: "Same data for everyone", text: "Everyone on the same tier gets the same data. There are no exclusive leads or paid rankings." },
  { title: "Consent first", text: "Private needs are shared only with the owner's consent." },
];

export const VISION = {
  mission: "Optimise wastewater reuse so treated water replaces freshwater instead of being discharged.",
  headline: "Optimise wastewater reuse.",
  subheadline: "So treated water replaces freshwater instead of being discharged.",
  description: "Venaqua helps you find uses for treated wastewater, connect with buyers and assess the costs of pipes and treatment upgrades. Explore funding options and track each project from the first signal to delivery.",
  pitch: "Spain reuses only 14.5% of its treated wastewater. Venaqua helps identify reuse projects worth building and prepare them for financing.",
  impact: "We measure how many m³ of freshwater are replaced by reused water. We count only additional, permitted reuse backed by meter data.",
  tagline: "Map, price and verify every industrial m³.",
  questions: [
    { pillar: "source" as Pillar, label: "Source", question: "Where does this site's water come from, and what are the alternatives?", status: "live" as ModuleStatus, note: "Live today" },
    { pillar: "risk" as Pillar, label: "Risk", question: "What could water cost by 2035, and what risks should you plan for?", status: "beta" as ModuleStatus, note: "Live for sites; data product for lenders and insurers coming" },
    { pillar: "proof" as Pillar, label: "Proof", question: "How can you prove water savings to auditors and banks?", status: "coming" as ModuleStatus, note: "Verified Water Ledger, coming" },
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
export const SAMPLE_LABEL = "Sample: illustrative";


// Positioning against the categories reviewers compare us with. Categories, not named brands — we only state what each category typically does.
export const LANDSCAPE_POSITION = {
  eyebrow: "Where Venaqua fits",
  title: "Others track projects, own the pipes or map the risk. Venaqua brings them together.",
  intro: "A reuse project needs a plant owner, an industrial buyer, a funder, a builder and an authority to agree on the same numbers. Each existing tool serves one of them. Venaqua is the shared, neutral screen they can all use.",
  columns: ["Market-intelligence databases", "Utilities’ in-house teams", "Water-risk maps", "Public map viewers", "Venaqua"],
  rows: [
    { q: "Matches a specific plant with specific buyers", v: ["-", "Own plants only", "-", "-", "Every plant, every site"] },
    { q: "Cost per m³ vs the alternative, and the year it flips", v: ["-", "Internal", "-", "-", "Per site, editable"] },
    { q: "Neutral: trusted by buyer, seller and funder", v: ["Yes", "No, they are a party to the deal", "Yes", "Yes", "Yes, flat prices, no success fees"] },
    { q: "Permit and funding route per project", v: ["Partial", "Internal", "-", "Permits only", "Built into every Investment Case"] },
    { q: "Industrial sites can start for free", v: ["-", "-", "Yes", "Yes", "Yes, the free map"] },
  ],
  note: "Comparison by category, based on what these tools typically offer; individual products vary.",
};

// Why the product gets harder to copy over time.
export const MOAT = [
  { title: "Confirmed site data", text: "Every customer who confirms a demand figure or adds a private site makes the next screening better. That data never exists in public viewers or analyst reports.", status: "live" as ModuleStatus },
  { title: "A record of how deals actually move", text: "Each tracked deal keeps its history from first signal to tender: which permits took how long, which funding was used, what stalled. That history is what turns screening into forecasting.", status: "live" as ModuleStatus },
  { title: "The neutral position", text: "Utilities can't be neutral about their own plants; consultancies are paid per project. A flat-price screen every party trusts is a position, not a feature, and it compounds with every party that joins.", status: "live" as ModuleStatus },
  { title: "Verified m³ replaced", text: "Meter-backed records show how much freshwater has been replaced, so auditors and lenders can check the savings.", status: "coming" as ModuleStatus },
];

// Working with incumbents rather than against them.
export const PARTNERS = {
  title: "Built to work with the big players, not to replace them",
  points: [
    { who: "Utilities and operators", text: "Find industrial buyers for the plants you already run and present authorities with an independently prepared case." },
    { who: "Analysts and data providers", text: "License our per-site Spain reuse layer through the Data API instead of building it from scratch." },
    { who: "Engineering and research teams", text: "Start feasibility studies from a screened shortlist with costs, routes and permits already laid out." },
  ],
};

// The big picture. Ambition, clearly labelled as such.
export const AMBITION = {
  eyebrow: "Where this goes",
  title: "The neutral market layer for Europe’s reused water.",
  text: "Today: Spain, with Catalonia as the pilot. Every layer is built on EU-wide sources, so the same screen can open in any European region as water stress spreads north. Our aim is to make finding, pricing, permitting and verifying reused water as established as trading electricity. Venaqua would give every party a shared basis for those decisions.",
  steps: [
    { when: "Now", what: "Spain screened site by site; Catalonia pilot with live drought data" },
    { when: "Next", what: "Portugal, Italy and southern France, using the same EU sources and model" },
    { when: "Then", what: "Verified m³ replaced, accepted by lenders, insurers and auditors" },
  ],
  label: "Ambition, not a forecast.",
};
