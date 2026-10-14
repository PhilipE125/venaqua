// Plan entitlements. The database trigger enforce_project_limit mirrors these limits.
export type PlanId = "market_access" | "portfolio" | "data_api";
export const PLAN_LABELS: Record<PlanId, string> = { market_access: "Deal Flow Pro", portfolio: "Deal Flow Team", data_api: "Data API" };
export function planLimit(plan: PlanId): number {
  return plan === "market_access" ? 10 : plan === "portfolio" ? 25 : 100;
}
export function hasApiAccess(plan: PlanId) { return plan === "data_api"; }
