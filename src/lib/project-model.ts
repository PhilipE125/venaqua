import { z } from "zod";

export const PROJECT_STAGES = ["Confirm supply", "Validate buyer demand", "Assess route and cost", "Create Deal File", "Engineering and permits", "Investment decision"] as const;
export const enquirySchema = z.object({ name: z.string().trim().min(1).max(100), email: z.string().trim().email().max(255), organisation: z.string().trim().min(1).max(200), role: z.string().trim().max(200), opportunity: z.string().trim().max(500), help: z.string().trim().min(1).max(3000) });
export interface OpportunitySnapshot {
  id: string; kind: string; name: string; location: string; plant: string; buyer: string;
  volume: number; distance: number | null; confidence: string; blocker: string; nextAction: string;
  cost: string; value: string; verdict: string;
}
export function feasibilityText(p: OpportunitySnapshot, owner: string, notes: string, stage: string) {
  return `REUSE MATCH · INDICATIVE PRE-FEASIBILITY BRIEF\n${p.name}\nPrepared ${new Date().toLocaleDateString("en-GB")}\n\nEXECUTIVE SUMMARY\n${p.verdict}\nLocation: ${p.location}\nOwner: ${owner || "Not assigned"}\nStage: ${stage}\n\nCOMMERCIAL CASE\nDelivered-water cost: ${p.cost}\nEstimated value: ${p.value}\n\nSUPPLY AND DEMAND\nPlant: ${p.plant || "Needs confirmation"}\nBuyer: ${p.buyer || "Needs confirmation"}\nIndicative volume: ${Math.round(p.volume).toLocaleString("en-GB")} m³/day\nDistance: ${p.distance == null ? "Needs routing study" : `${p.distance.toFixed(1)} km straight line`}\n\nCONFIDENCE\n${p.confidence}\n\nRISKS AND UNKNOWNS\n${p.blocker}\nWater quality, firm capacity, buyer commitment, pipe rights, permits and funding need validation.\n\nRECOMMENDED ROUTE\n${PROJECT_STAGES.join(" → ")}\n\nNEXT ACTION\n${p.nextAction}\n\nPROJECT NOTES\n${notes || "None supplied"}\n\nThis is an indicative screening brief based on public data and user inputs. It has NOT been engineer-reviewed. It is not a permit, investment recommendation or final engineering document. Request an engineer-reviewed Deal File from support@venaqua.com.`;
}