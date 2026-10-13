import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { OpportunitySnapshot } from "./project-model";

type Workspace = Tables<"workspaces">;
type WorkspaceState = {
  user: User | null; ready: boolean; workspace: Workspace | null;
  /** Opens the calm "turn this into a project decision" panel; redirect is where signup/login returns. */
  authOpen: boolean; setAuthOpen: (b: boolean) => void; gateRedirect: string; openGate: (redirect?: string) => void;
  contact: string | null; setContact: (s: string | null) => void;
  save: (p: OpportunitySnapshot) => Promise<boolean>; count: number; refresh: () => void;
  updateOnboarding: (key: string) => void;
};
const Context = createContext<WorkspaceState | null>(null);

/** Only same-origin relative paths are accepted as post-auth destinations. */
export function safeRedirect(r: unknown, fallback = "/app") {
  return typeof r === "string" && r.startsWith("/") && !r.startsWith("//") ? r : fallback;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [authOpen, setAuthOpenRaw] = useState(false);
  const [gateRedirect, setGateRedirect] = useState("/app");
  const [contact, setContact] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [version, bump] = useState(0);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { setUser(data.user); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((event, session) => { if (["INITIAL_SESSION", "SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) { setUser(session?.user ?? null); setReady(true); } });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => { if (!user) { setCount(0); return; } supabase.from("reuse_projects").select("id", { count: "exact", head: true }).then(({ count }) => setCount(count ?? 0)); }, [user, version]);
  // Every signed-in user gets a Free Explorer workspace, created from signup details on first sign-in.
  useEffect(() => {
    if (!user) { setWorkspace(null); return; }
    let live = true;
    (async () => {
      const { data } = await supabase.from("workspaces").select("*").eq("user_id", user.id).maybeSingle();
      if (data) { if (live) setWorkspace(data); return; }
      const m = user.user_metadata ?? {};
      const { data: created } = await supabase.from("workspaces").insert({ name: String(m.organisation || "My workspace").slice(0, 200), full_name: String(m.full_name || m.name || "").slice(0, 100), role: String(m.role || "").slice(0, 100), goal: String(m.goal || "").slice(0, 100) }).select("*").single();
      if (live && created) setWorkspace(created);
    })();
    return () => { live = false; };
  }, [user]);
  const openGate = (redirect?: string) => { setGateRedirect(safeRedirect(redirect ?? (typeof window !== "undefined" ? window.location.pathname + window.location.search : "/app"))); setAuthOpenRaw(true); };
  return <Context.Provider value={{ user, ready, workspace, authOpen, setAuthOpen: b => b ? openGate() : setAuthOpenRaw(false), gateRedirect, openGate, contact, setContact, count, refresh: () => bump(v => v + 1),
    updateOnboarding: async key => { if (!workspace) return; const onboarding = { ...(workspace.onboarding as Record<string, boolean>), [key]: true }; setWorkspace({ ...workspace, onboarding }); await supabase.from("workspaces").update({ onboarding }).eq("id", workspace.id); },
    save: async p => {
      if (!user) { openGate(`/analysis?kind=${encodeURIComponent(p.kind)}&id=${encodeURIComponent(p.id)}`); return false; }
      const { error } = await supabase.from("reuse_projects").insert({ name: p.name, opportunity: { ...p }, next_action: p.nextAction, confidence: p.confidence, blocker: p.blocker, activity: [{ text: "Opportunity shortlisted", date: new Date().toISOString() }] });
      if (error) throw new Error("Could not save this project. Please try again.");
      bump(v => v + 1); return true;
    } }}>{children}</Context.Provider>;
}
export function useWorkspace() { const v = useContext(Context); if (!v) throw new Error("Workspace provider missing"); return v; }
