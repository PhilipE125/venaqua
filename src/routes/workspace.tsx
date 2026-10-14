import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Copy, KeyRound, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useWorkspace } from "@/lib/workspace";
import { hasApiAccess } from "@/lib/plans";
import { DEFAULT_WEIGHTS, type ScoreWeights } from "@/lib/score";
import { createApiKey } from "@/lib/apiKeys.functions";
import { parseSitesCsv } from "@/lib/privateSites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/workspace")({
  head: () => ({ meta: [
    { title: "Workspace settings · Venaqua" },
    { name: "description", content: "Your Venaqua plan, custom opportunity scoring, private data layers and API keys." },
    { property: "og:title", content: "Workspace settings · Venaqua" },
    { property: "og:description", content: "Manage plan, scoring, private data and API access." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: WorkspacePage,
});

function Section({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return <section className="rounded-xl border bg-card p-6"><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{text}</p><div className="mt-5">{children}</div></section>;
}

function WorkspacePage() {
  const { user, setAuthOpen, planLabel, plan, limit, count, setContact } = useWorkspace();
  return <div className="min-h-screen bg-background">
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-10">
      <Link to="/projects" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Projects</Link>
      <h1 className="text-3xl font-semibold">Workspace settings</h1>
      {!user ? <div className="py-10 text-center"><p className="mb-4 text-muted-foreground">Sign in to manage your workspace.</p><Button onClick={() => setAuthOpen(true)}>Sign in</Button></div> : <>
        <Section title="Your plan" text="Plans are set by the Venaqua team when your subscription starts.">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><Badge>{planLabel}</Badge><p className="mt-2 text-sm">{count} of {limit} active projects used</p></div><Button variant="outline" onClick={() => setContact(`Plan change — currently ${planLabel}`)}>Change plan</Button></div>
        </Section>
        <ScoringSection />
        <PrivateSitesSection />
        <ApiSection enabled={hasApiAccess(plan)} />
      </>}
    </main>
  </div>;
}

function ScoringSection() {
  const { weights, setWeights } = useWorkspace();
  const [w, setW] = useState<ScoreWeights>(weights);
  useEffect(() => setW(weights), [weights]);
  const rows: [keyof ScoreWeights, string, string][] = [["volume", "Matched volume", "How much more bigger volumes count"], ["stress", "Water stress", "How much drought pressure lifts a match"], ["distance", "Distance penalty", "How strongly long pipe routes are penalised"]];
  return <Section title="Custom scoring" text="Tune how opportunities are ranked on the map. 1 is the standard Venaqua score; 0 ignores a factor.">
    <div className="space-y-5">{rows.map(([k, label, hint]) => <div key={k}><div className="flex justify-between text-sm"><Label>{label}</Label><span className="tnum">{w[k].toFixed(1)}</span></div><p className="text-xs text-muted-foreground">{hint}</p><Slider className="mt-2" min={0} max={3} step={0.1} value={[w[k]]} onValueChange={([v]) => setW({ ...w, [k]: v ?? 1 })} /></div>)}</div>
    <div className="mt-5 flex gap-2"><Button onClick={() => setWeights(w).then(() => toast.success("Scoring saved — the map now uses your weights"), (e: Error) => toast.error(e.message))}>Save scoring</Button><Button variant="ghost" onClick={() => setW(DEFAULT_WEIGHTS)}>Reset to standard</Button></div>
  </Section>;
}

function PrivateSitesSection() {
  const { user, privateSites, refresh } = useWorkspace();
  async function upload(file: File) {
    const { rows, errors } = parseSitesCsv(await file.text());
    if (errors.length) toast.error(`${errors.length} rows skipped: ${errors[0]}`);
    if (!rows.length || !user) return;
    const { error } = await supabase.from("private_sites").insert(rows.map(r => ({ ...r, user_id: user.id })));
    if (error) toast.error("Could not upload your sites."); else { toast.success(`${rows.length} sites added to your private layer`); refresh(); }
  }
  async function remove(id: string) { await supabase.from("private_sites").delete().eq("id", id); refresh(); }
  return <Section title="Private data layer" text="Upload your own sites — demand points or water sources. They appear only to you on the map, and in exports and the API.">
    <Label htmlFor="sites-csv" className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-accent"><Upload className="h-4 w-4" />Upload CSV</Label>
    <input id="sites-csv" type="file" accept=".csv,text/csv" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
    <p className="mt-2 text-xs text-muted-foreground">Columns: name, kind (demand or supply), lat, lon, volume_m3_day, notes</p>
    <ul className="mt-4 divide-y text-sm">{privateSites.map((s: Tables<"private_sites">) => <li key={s.id} className="flex items-center justify-between gap-2 py-2"><span><Badge variant="outline" className="mr-2">{s.kind}</Badge>{s.name} <span className="text-muted-foreground">· {Number(s.volume_m3_day).toLocaleString("en-GB")} m³/day</span></span><Button size="icon" variant="ghost" aria-label={`Remove ${s.name}`} onClick={() => remove(s.id)}><Trash2 /></Button></li>)}</ul>
  </Section>;
}

function ApiSection({ enabled }: { enabled: boolean }) {
  const { user, setContact } = useWorkspace();
  const create = useServerFn(createApiKey);
  const [keys, setKeys] = useState<Pick<Tables<"api_keys">, "id" | "name" | "prefix" | "created_at" | "last_used_at" | "revoked_at">[]>([]);
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const [v, bump] = useState(0);
  useEffect(() => { if (user) supabase.from("api_keys").select("id,name,prefix,created_at,last_used_at,revoked_at").order("created_at", { ascending: false }).then(({ data }) => setKeys(data ?? [])); }, [user, v]);
  async function add() {
    try { const { key } = await create({ data: { name: name || "Default" } }); setFresh(key); setName(""); bump(x => x + 1); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not create key"); }
  }
  async function revoke(id: string) { await supabase.from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", id); bump(x => x + 1); }
  const base = typeof window === "undefined" ? "" : window.location.origin;
  return <Section title="API access" text="Pull your projects, private sites and normalised plant data into your own tools.">
    {!enabled ? <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm">API keys are part of the Data API plan.</p><Button variant="outline" onClick={() => setContact("Data / API enquiry")}>Talk to the team</Button></div> : <>
      <div className="flex gap-2"><Input value={name} maxLength={100} onChange={e => setName(e.target.value)} placeholder="Key name, e.g. GIS team" /><Button onClick={add}><KeyRound />Create key</Button></div>
      {fresh && <div className="mt-3 rounded-md border border-primary/40 bg-primary/5 p-3 text-sm"><p className="font-medium">Copy this key now — it won't be shown again.</p><div className="mt-2 flex items-center gap-2"><code className="break-all">{fresh}</code><Button size="icon" variant="ghost" aria-label="Copy key" onClick={() => { navigator.clipboard.writeText(fresh); toast.success("Copied"); }}><Copy /></Button></div></div>}
      <ul className="mt-4 divide-y text-sm">{keys.map(k => <li key={k.id} className="flex items-center justify-between gap-2 py-2"><span>{k.name} <code className="text-muted-foreground">{k.prefix}…</code>{k.revoked_at ? <Badge variant="outline" className="ml-2">Revoked</Badge> : <span className="ml-2 text-xs text-muted-foreground">{k.last_used_at ? `last used ${new Date(k.last_used_at).toLocaleDateString("en-GB")}` : "never used"}</span>}</span>{!k.revoked_at && <Button size="sm" variant="ghost" onClick={() => revoke(k.id)}>Revoke</Button>}</li>)}</ul>
      <pre className="mt-4 overflow-x-auto rounded-md bg-muted p-3 text-xs">{`curl -H "Authorization: Bearer vq_…" ${base}/api/public/v1/projects
${base}/api/public/v1/private-sites
${base}/api/public/v1/plants?country=ES`}</pre>
    </>}
  </Section>;
}
