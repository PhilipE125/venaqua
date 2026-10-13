import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { OpportunitySnapshot } from "./project-model";

type WorkspaceState = { user: User | null; authOpen: boolean; setAuthOpen: (b: boolean) => void; contact: string | null; setContact: (s: string | null) => void; save: (p: OpportunitySnapshot) => Promise<boolean>; count: number; refresh: () => void };
const Context = createContext<WorkspaceState | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [contact, setContact] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [version, bump] = useState(0);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((event, session) => { if (["INITIAL_SESSION", "SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) setUser(session?.user ?? null); });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => { if (!user) { setCount(0); return; } supabase.from("reuse_projects").select("id", { count: "exact", head: true }).then(({ count }) => setCount(count ?? 0)); }, [user, version]);
  return <Context.Provider value={{ user, authOpen, setAuthOpen, contact, setContact, count, refresh: () => bump(v => v + 1), save: async p => {
    if (!user) { setAuthOpen(true); return false; }
    const { error } = await supabase.from("reuse_projects").insert({ name: p.name, opportunity: { ...p }, activity: [{ text: "Opportunity shortlisted", date: new Date().toISOString() }] });
    if (error) throw new Error("Could not save this project. Please try again.");
    bump(v => v + 1); return true;
  } }}>{children}</Context.Provider>;
}
export function useWorkspace() { const v = useContext(Context); if (!v) throw new Error("Workspace provider missing"); return v; }