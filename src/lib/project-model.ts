import { z } from "zod";
import { droughtEventCost, reuseInvestmentCase, type DroughtCostInputs } from "./droughtCosts";

export const PROJECT_STAGES = ["Confirm supply", "Validate buyer demand", "Assess route and cost", "Create Deal File", "Engineering and permits", "Investment decision"] as const;
export const enquirySchema = z.object({ name: z.string().trim().min(1).max(100), email: z.string().trim().email().max(255), organisation: z.string().trim().min(1).max(200), role: z.string().trim().max(200), opportunity: z.string().trim().max(500), help: z.string().trim().min(1).max(3000) });
export interface OpportunitySnapshot {
  id: string; kind: string; name: string; location: string; plant: string; buyer: string;
  volume: number; distance: number | null; confidence: string; blocker: string; nextAction: string;
  cost: string; value: string; verdict: string;
}
export type EvidenceEntry = { text: string; kind: "measured" | "modelled" | "estimated" | "confirmed"; source: string; date: string };

/** Illustrative drought exposure for a brief. All inputs are stated assumptions, not observed losses. */
export const BRIEF_DROUGHT_ASSUMPTIONS = { restrictionDays: 90, lossPerM3: 20, backupShare: 0.3, backupPremium: 3, responseCost: 50_000, capexPerM3Day: 1_500, opexPerM3: 0.35, eventsPerYear: 0.2 };
export function briefDroughtCase(volume: number) {
  const a = BRIEF_DROUGHT_ASSUMPTIONS;
  const v = Math.max(0, volume || 0);
  const inputs: DroughtCostInputs = { dailyDemand: v, restrictionDays: a.restrictionDays, lossPerM3: a.lossPerM3, backupShare: a.backupShare, backupPremium: a.backupPremium, responseCost: a.responseCost, protectedShare: 0 };
  const cut15 = droughtEventCost(inputs, 0.15).total;
  const cut25 = droughtEventCost(inputs, 0.25).total;
  const invest = reuseInvestmentCase(inputs, 0.25, a.restrictionDays, { additionalProtectedShare: 1, capitalCost: v * a.capexPerM3Day * 0.25, annualOperatingCost: v * 0.25 * 365 * a.opexPerM3 * a.eventsPerYear, eventsPerYear: a.eventsPerYear, years: 10 });
  return { cut15, cut25, invest };
}

function droughtSection(volume: number) {
  const eur = (n: number) => `€${Math.round(n).toLocaleString("en-GB")}`;
  const a = BRIEF_DROUGHT_ASSUMPTIONS;
  const { cut15, cut25, invest } = briefDroughtCase(volume);
  return `DROUGHT EXPOSURE AND PAYBACK (ILLUSTRATIVE)
Real reference rules: Catalonia 2023 industrial cut 15%, 2024 cut 25%.
Cost of one ${a.restrictionDays}-day event at a 15% cut: ${eur(cut15)}
Cost of one ${a.restrictionDays}-day event at a 25% cut: ${eur(cut25)}
Reuse covering the cut volume — capital ${eur(volume * a.capexPerM3Day * 0.25)}, avoided cost per event ${eur(invest.avoidedPerEvent)}, simple payback ${invest.simplePayback == null ? "not reached" : `${invest.simplePayback.toFixed(1)} years`}
Assumptions: €${a.lossPerM3} lost contribution per unmet m³, ${a.backupShare * 100}% backup supply at €${a.backupPremium}/m³ premium, €${a.capexPerM3Day.toLocaleString("en-GB")} capital per m³/day, ${a.eventsPerYear} events per year. These are not recorded losses or a guaranteed return.`;
}

function evidenceSection(evidence: EvidenceEntry[]) {
  if (!evidence.length) return "EVIDENCE LOG\nNo evidence logged yet.";
  return `EVIDENCE LOG
${evidence.map(e => `- [${e.kind}] ${e.text}${e.source ? ` (source: ${e.source})` : ""} · ${new Date(e.date).toLocaleDateString("en-GB")}`).join("\n")}`;
}

export function feasibilityText(p: OpportunitySnapshot, owner: string, notes: string, stage: string, evidence: EvidenceEntry[] = []) {
  return `VENAQUA · INDICATIVE PRE-FEASIBILITY BRIEF\n${p.name}\nPrepared ${new Date().toLocaleDateString("en-GB")}\n\nEXECUTIVE SUMMARY\n${p.verdict}\nLocation: ${p.location}\nOwner: ${owner || "Not assigned"}\nStage: ${stage}\n\nCOMMERCIAL CASE\nDelivered-water cost: ${p.cost}\nEstimated value: ${p.value}\n\nSUPPLY AND DEMAND\nPlant: ${p.plant || "Needs confirmation"}\nBuyer: ${p.buyer || "Needs confirmation"}\nIndicative volume: ${Math.round(p.volume).toLocaleString("en-GB")} m³/day\nDistance: ${p.distance == null ? "Needs routing study" : `${p.distance.toFixed(1)} km straight line`}\n\nCONFIDENCE\n${p.confidence}\n\nRISKS AND UNKNOWNS\n${p.blocker}\nWater quality, firm capacity, buyer commitment, pipe rights, permits and funding need validation.\n\n${droughtSection(p.volume)}\n\n${evidenceSection(evidence)}\n\nRECOMMENDED ROUTE\n${PROJECT_STAGES.join(" → ")}\n\nNEXT ACTION\n${p.nextAction}\n\nPROJECT NOTES\n${notes || "None supplied"}\n\nThis is an indicative screening brief based on public data and user inputs. It has NOT been engineer-reviewed. It is not a permit, investment recommendation or final engineering document. Request an engineer-reviewed Deal File from support@venaqua.com.`;
}