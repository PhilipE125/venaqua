import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Droplets } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkspace } from "@/lib/workspace";

export const ROLES = ["Water operator", "Engineering/advisory firm", "Industrial company", "Industrial association", "Public authority", "Investor/developer"];
export const GOALS = ["Find opportunities", "Screen a portfolio", "Evaluate a site", "Monitor market signals", "Manage projects"];

function Shell({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
    <div className="w-full max-w-md">
      <Link to="/" className="mb-8 flex items-center justify-center gap-2"><Droplets className="h-6 w-6 text-primary" /><span className="text-lg font-semibold">Venaqua</span></Link>
      <div className="rounded-lg border bg-card p-6 shadow-map-panel"><h1 className="text-xl font-semibold">{title}</h1><p className="mt-1 text-sm text-muted-foreground">{sub}</p><div className="mt-6 space-y-4">{children}</div></div>
    </div>
  </div>;
}

function useRedirectWhenSignedIn(redirect: string) {
  const { user } = useWorkspace();
  const navigate = useNavigate();
  useEffect(() => { if (user) navigate({ href: redirect, replace: true }); }, [user, redirect, navigate]);
}

function Google({ redirect, setMessage }: { redirect: string; setMessage: (s: string) => void }) {
  return <Button variant="outline" className="w-full" onClick={async () => { const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/login?redirect=${encodeURIComponent(redirect)}` }); if (r.error) setMessage(r.error.message); }}>Continue with Google</Button>;
}

export function LoginForm({ redirect }: { redirect: string }) {
  useRedirectWhenSignedIn(redirect);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  return <Shell title="Log in to Venaqua" sub="Open your workspace, saved opportunities and projects.">
    <Google redirect={redirect} setMessage={setMessage} />
    <p className="text-center text-xs text-muted-foreground">or use your email</p>
    <form className="space-y-4" onSubmit={async e => { e.preventDefault(); setBusy(true); setMessage(""); const password = String(new FormData(e.currentTarget).get("password")); const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) setMessage(error.message); setBusy(false); }}>
      <div className="space-y-1"><Label htmlFor="login-email">Work email</Label><Input id="login-email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
      <div className="space-y-1"><Label htmlFor="login-password">Password</Label><Input id="login-password" name="password" type="password" required autoComplete="current-password" /></div>
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Please wait…" : "Log in"}</Button>
    </form>
    <div className="flex flex-wrap justify-between gap-2 text-sm">
      <Button variant="link" className="h-auto p-0" onClick={async () => { if (!email) { setMessage("Enter your email first."); return; } const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" }); setMessage(error ? error.message : "Check your email for a password reset link."); }}>Forgot password?</Button>
      <Link to="/signup" search={{ redirect }} className="text-primary">Create a free workspace</Link>
    </div>
    {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
  </Shell>;
}

export function SignupForm({ redirect }: { redirect: string }) {
  useRedirectWhenSignedIn(redirect);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [role, setRole] = useState("");
  const [goal, setGoal] = useState("");
  const [sent, setSent] = useState(false);
  if (sent) return <Shell title="Check your email" sub="We sent a verification link to confirm your work email."><p className="text-sm">After confirming, you will return to Venaqua with your Free Explorer workspace ready.</p><Button asChild variant="outline" className="w-full"><Link to="/explore">Continue exploring</Link></Button></Shell>;
  return <Shell title="Create your free workspace" sub="No payment details needed. Start with the Free Explorer plan.">
    <Google redirect={redirect} setMessage={setMessage} />
    <p className="text-center text-xs text-muted-foreground">or sign up with your work email</p>
    <form className="space-y-4" onSubmit={async e => {
      e.preventDefault(); setMessage("");
      if (!role || !goal) { setMessage("Please choose your role and primary goal."); return; }
      setBusy(true);
      const f = new FormData(e.currentTarget);
      const { data, error } = await supabase.auth.signUp({ email: String(f.get("email")).trim(), password: String(f.get("password")), options: { emailRedirectTo: `${window.location.origin}/login?redirect=${encodeURIComponent(redirect)}`, data: { full_name: String(f.get("name")).trim().slice(0, 100), organisation: String(f.get("organisation")).trim().slice(0, 200), role, goal } } });
      if (error) setMessage(error.message); else if (!data.session) setSent(true);
      setBusy(false);
    }}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1"><Label htmlFor="su-name">Name</Label><Input id="su-name" name="name" required maxLength={100} autoComplete="name" /></div>
        <div className="space-y-1"><Label htmlFor="su-org">Organisation</Label><Input id="su-org" name="organisation" required maxLength={200} autoComplete="organization" /></div>
      </div>
      <div className="space-y-1"><Label htmlFor="su-email">Work email</Label><Input id="su-email" name="email" type="email" required maxLength={255} autoComplete="email" /></div>
      <div className="space-y-1"><Label htmlFor="su-password">Password</Label><Input id="su-password" name="password" type="password" required minLength={8} autoComplete="new-password" /></div>
      <div className="space-y-1"><Label>Role</Label><Select value={role} onValueChange={setRole}><SelectTrigger aria-label="Role"><SelectValue placeholder="Choose your role" /></SelectTrigger><SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1"><Label>Primary goal</Label><Select value={goal} onValueChange={setGoal}><SelectTrigger aria-label="Primary goal"><SelectValue placeholder="What do you want to do first?" /></SelectTrigger><SelectContent>{GOALS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select></div>
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Creating…" : "Create free workspace"}</Button>
    </form>
    <p className="text-center text-sm">Already have an account? <Link to="/login" search={{ redirect }} className="text-primary">Log in</Link></p>
    {message && <p role="status" className="text-sm text-destructive">{message}</p>}
  </Shell>;
}
