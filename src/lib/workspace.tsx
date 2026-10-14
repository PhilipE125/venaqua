import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { OpportunitySnapshot } from "./project-model";
import { DEFAULT_WEIGHTS, type ScoreWeights } from "./score";
import { PLAN_LABELS, planLimit, type PlanId } from "./plans";

type WorkspaceState = {
  user: User | null; authOpen: boolean; setAuthOpen: (b: boolean) => void;
  contact: string | null; setContact: (s: string | null) => void;
  save: (p: OpportunitySnapshot) => Promise<boolean>; count: number; refresh: () => void;
  plan: PlanId; planLabel: string; limit: number;
  weights: ScoreWeights; setWeights: (w: ScoreWeights) => Promise<void>;
  alerts: Tables<"project_alerts">[]; privateSites: Tables<"private_sites">[];
};
const Context = createContext<WorkspaceState | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [contact, setContact] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [version, bump] = useState(0);
  const [plan, setPlan] = useState<PlanId>("market_access");
  const [weights, setW] = useState<ScoreWeights>(DEFAULT_WEIGHTS);
  const [alerts, setAlerts] = useState<Tables<"project_alerts">[]>([]);
  const [privateSites, setSites] = useState<Tables<"private_sites">[]>([]);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((event, session) => { if (["INITIAL_SESSION", "SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) setUser(session?.user ?? null); });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!user) { setCount(0); setPlan("market_access"); setW(DEFAULT_WEIGHTS); setAlerts([]); setSites([]); return; }
    supabase.from("reuse_projects").select("id", { count: "exact", head: true }).then(({ count }) => setCount(count ?? 0));
    supabase.from("workspace_plans").select("plan").maybeSingle().then(({ data }) => setPlan((data?.plan as PlanId) ?? "market_access"));
    supabase.from("scoring_preferences").select("*").maybeSingle().then(({ data }) => setW(data ? { volume: Number(data.volume_weight), stress: Number(data.stress_weight), distance: Number(data.distance_weight) } : DEFAULT_WEIGHTS));
    supabase.from("project_alerts").select("*").order("created_at", { ascending: false }).limit(50).then(({ data }) => setAlerts(data ?? []));
    supabase.from("private_sites").select("*").order("created_at", { ascending: false }).then(({ data }) => setSites(data ?? []));
  }, [user, version]);
  const limit = planLimit(plan);
  return <Context.Provider value={{
    user, authOpen, setAuthOpen, contact, setContact, count, refresh: () => bump(v => v + 1),
    plan, planLabel: PLAN_LABELS[plan], limit, weights, alerts, privateSites,
    setWeights: async w => {
      setW(w);
      if (!user) return;
      const { error } = await supabase.from("scoring_preferences").upsert({ user_id: user.id, volume_weight: w.volume, stress_weight: w.stress, distance_weight: w.distance, updated_at: new Date().toISOString() });
      if (error) throw new Error("Could not save scoring weights.");
    },
    save: async p => {
      if (!user) { setAuthOpen(true); return false; }
      if (count >= limit) throw new Error(`Your ${PLAN_LABELS[plan]} plan includes ${limit} active projects. Archive one or talk to the team about upgrading.`);
      const { error } = await supabase.from("reuse_projects").insert({ name: p.name, opportunity: { ...p }, activity: [{ text: "Opportunity shortlisted", date: new Date().toISOString() }] });
      if (error) throw new Error(error.message.includes("PROJECT_LIMIT_REACHED") ? `Your plan includes ${limit} active projects. Archive one or talk to the team about upgrading.` : "Could not save this project. Please try again.");
      bump(v => v + 1); return true;
    },
  }}>{children}</Context.Provider>;
}
export function useWorkspace() { const v = useContext(Context); if (!v) throw new Error("Workspace provider missing"); return v; }
