// Co-investment cases. Figures are only those supplied by the Venaqua team; anything not yet supplied stays null
// and renders as "Pending case file". Never fill gaps with invented numbers.
export type Verdict = "Strong" | "Likely" | "Marginal" | "Weak";
export type InvestmentCase = {
  id: string;
  name: string;
  region: string;
  plant: string;
  buyers: string;
  capexEur: number | null;
  deliveredEurM3: number | null;
  todayEurM3: [number, number] | null;
  yearlySavingEur: number | null;
  paybackYears: number | null;
  verdict: Verdict | null;
  sharedVsAlone: { shared: number; alone: number; note: string } | null;
};

export const INVESTMENT_CASES: InvestmentCase[] = [
  { id: "costa-del-sol", name: "Costa del Sol golf and hotel networks", region: "Andalucía", plant: "Costa del Sol treatment plants", buyers: "Golf courses and hotels", capexEur: 42_000_000, deliveredEurM3: 0.55, todayEurM3: [0.8, 1.6], yearlySavingEur: null, paybackYears: 4, verdict: "Strong", sharedVsAlone: null },
  { id: "tarragona-iii", name: "Tarragona chemical cluster, phase III", region: "Cataluña", plant: "Tarragona reclamation plant", buyers: "Chemical cluster companies", capexEur: 9_700_000, deliveredEurM3: 0.72, todayEurM3: [1.73, 2.59], yearlySavingEur: null, paybackYears: 2, verdict: "Strong", sharedVsAlone: null },
  { id: "parc-sagunt-ii", name: "Parc Sagunt II tenants", region: "Comunitat Valenciana", plant: "Sagunt treatment plant", buyers: "Industrial park tenants", capexEur: 4_700_000, deliveredEurM3: 0.53, todayEurM3: [1.0, 2.0], yearlySavingEur: null, paybackYears: 3, verdict: "Strong", sharedVsAlone: null },
  { id: "huelva-chem", name: "Huelva chemical cluster", region: "Andalucía", plant: "Huelva treatment plant", buyers: "Chemical cluster companies", capexEur: null, deliveredEurM3: null, todayEurM3: null, yearlySavingEur: null, paybackYears: null, verdict: null, sharedVsAlone: { shared: 0.35, alone: 1.19, note: "Capital cost per m³: shared line vs the smallest company building alone" } },
  { id: "cartagena", name: "Cartagena", region: "Región de Murcia", plant: "Cartagena treatment plant", buyers: "Nearby industrial users", capexEur: null, deliveredEurM3: null, todayEurM3: null, yearlySavingEur: null, paybackYears: null, verdict: "Weak", sharedVsAlone: null },
  { id: "talavera", name: "Talavera", region: "Castilla-La Mancha", plant: "Talavera treatment plant", buyers: "Nearby industrial users", capexEur: null, deliveredEurM3: null, todayEurM3: null, yearlySavingEur: null, paybackYears: null, verdict: "Weak", sharedVsAlone: null },
];

export const CASE_DISCLAIMER = "Estimates from public data and stated assumptions. Not engineering or investment advice.";
