import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Download, ExternalLink, FileText, FolderOpen, MapPin, MessageCircle, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import { useWorkspace } from "@/lib/workspace";
import { useApp, type Selection } from "@/lib/state";
import { feasibilityText, PROJECT_STAGES, type OpportunitySnapshot } from "@/lib/project-model";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/projects")({ head: () => ({ meta: [{ title: "Reuse pipeline · Venaqua" }, { name: "description", content: "Manage your water-reuse pipeline: stages, owners, next actions, assumptions and evidence." }, { property: "og:title", content: "Reuse pipeline · Venaqua" }, { property: "og:description", content: "Your private workspace for turning water reuse opportunities into projects." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }), component: () => <RequireAuth><Projects /></RequireAuth> });

type Entry = { text: string; date: string; author?: string };
const list = (j: Json | undefined): Entry[] => Array.isArray(j) ? (j as unknown as Entry[]) : [];
type Project = Tables<"reuse_projects">;
type LogKey = "assumptions" | "evidence" | "comments";

function Projects() {
  const { user, setContact, refresh } = useWorkspace();
  const { select } = useApp();
  const [projects, setProjects] = useState<Project[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ notes: "", owner_name: "", stage: PROJECT_STAGES[0] as string, next_action: "", confidence: "", blocker: "" });
  const [brief, setBrief] = useState(false);
  const [version, bump] = useState(0);
  useEffect(() => { if (!user) return; setLoading(true); supabase.from("reuse_projects").select("*").order("created_at", { ascending: false }).then(({ data, error }) => { setProjects(data ?? []); setError(error ? "Could not load your projects. Please try again." : ""); setLoading(false); }); }, [user, version]);
  const project = projects.find(p => p.id === active) ?? projects[0];
  const snapshot = project?.opportunity as unknown as OpportunitySnapshot | undefined;
  useEffect(() => { if (!project) return; const s = project.opportunity as unknown as OpportunitySnapshot; setForm({ notes: project.notes, owner_name: project.owner_name, stage: project.stage, next_action: project.next_action || s?.nextAction || "", confidence: project.confidence || s?.confidence || "", blocker: project.blocker || s?.blocker || "" }); }, [project?.id, version]);
  const author = user?.email ?? "You";
  async function update(patch: Partial<Project>, activityText: string) {
    if (!project) return;
    const { error } = await supabase.from("reuse_projects").update({ ...patch, activity: [...list(project.activity), { text: activityText, date: new Date().toISOString(), author }] as unknown as Json }).eq("id", project.id);
    if (error) toast.error("Could not update project."); else { toast.success("Project updated"); bump(v => v + 1); refresh(); }
  }
  const save = () => update(form, project && project.stage !== form.stage ? `Stage changed to ${form.stage}` : "Project details updated");
  const addLog = (key: LogKey, text: string) => project && update({ [key]: [...list(project[key]), { text, date: new Date().toISOString(), author }] as unknown as Json }, `${key === "comments" ? "Comment" : key === "evidence" ? "Evidence" : "Assumption"} added`);
  const download = () => { if (!snapshot) return; const blob = new Blob([feasibilityText({ ...snapshot, nextAction: form.next_action, blocker: form.blocker, confidence: form.confidence }, form.owner_name, form.notes, form.stage)], { type: "text/plain;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${snapshot.name.replace(/[^a-zA-Z0-9 -]/g, "")}-feasibility-brief.txt`; a.click(); URL.revokeObjectURL(url); };
  const kind = snapshot?.kind as NonNullable<Selection>["kind"] | undefined;
  return <div className="min-h-screen bg-background"><header className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-6 py-4"><div className="flex items-center gap-5"><Button asChild variant="ghost" size="sm"><Link to="/app"><ArrowLeft />Map</Link></Button><span className="font-semibold">Venaqua <span className="font-normal text-muted-foreground">/ Reuse pipeline</span></span></div><Button variant="outline" size="sm" onClick={() => setContact(project?.name ?? "Project enquiry")}><MessageCircle />Talk to the team</Button></header>
  <main className="mx-auto max-w-7xl px-6 py-10"><div className="mb-8 flex items-end justify-between"><div><p className="label-caps">Develop a project</p><h1 className="mt-2 text-3xl font-semibold">Reuse pipeline</h1><p className="mt-2 text-sm text-muted-foreground">From an opportunity to a validated project decision.</p></div><Badge variant="outline">{projects.length} projects</Badge></div>
  {loading ? <p role="status">Loading your projects…</p> : error ? <p role="alert">{error}</p> : !project || !snapshot ? <section className="py-16 text-center"><FolderOpen className="mx-auto mb-4 h-10 w-10 text-primary" /><h2 className="text-xl font-semibold">Your next water project starts here</h2><p className="my-3 text-sm text-muted-foreground">No saved opportunities yet. Open an analysis on the map and choose “Save project”.</p><Button asChild><Link to="/app">Explore opportunities<ArrowRight /></Link></Button></section> : <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
  <nav className="space-y-1" aria-label="Pipeline projects">{projects.map(p => <Button key={p.id} variant={p.id === project.id ? "secondary" : "ghost"} className="h-auto w-full items-start justify-start whitespace-normal py-3 text-left" onClick={() => setActive(p.id)}><FolderOpen className="mt-0.5 shrink-0" /><span className="min-w-0"><span className="block font-medium">{p.name}</span><span className="mt-1 block text-xs text-muted-foreground">{p.stage}{p.owner_name ? ` · ${p.owner_name}` : ""}</span>{p.next_action && <span className="mt-1 block truncate text-xs">Next: {p.next_action}</span>}</span></Button>)}</nav>
  <section className="min-w-0">
    <div className="flex flex-wrap gap-2"><Badge>{project.stage}</Badge><Badge variant="outline" className="text-warning">Needs validation</Badge></div>
    <h2 className="mt-3 text-2xl font-semibold">{project.name}</h2><p className="mt-1 text-sm text-muted-foreground">{snapshot.location}</p><p className="mt-4 text-base">{snapshot.verdict}</p>
    <div className="mt-4 flex flex-wrap gap-2">{kind && <><Button asChild size="sm" variant="outline"><Link to="/analysis" search={{ kind, id: snapshot.id }}><ExternalLink />Full analysis</Link></Button><Button asChild size="sm" variant="outline"><Link to="/app" onClick={() => select({ kind, id: snapshot.id })}><MapPin />Show on map</Link></Button></>}</div>
    <div className="my-6 grid grid-cols-2 gap-x-6 gap-y-5 border-y py-6 md:grid-cols-3">{[["Indicative volume", `${Math.round(snapshot.volume).toLocaleString("en-GB")} m³/day`], ["Delivered cost", snapshot.cost], ["Estimated value", snapshot.value], ["Linked plant", snapshot.plant || "Not confirmed"], ["Linked company", snapshot.buyer || "Not confirmed"], ["Distance", snapshot.distance == null ? "Needs routing study" : `${snapshot.distance.toFixed(1)} km`]].map(([label, value]) => <div key={label}><p className="label-caps">{label}</p><p className="mt-1 break-words text-sm font-medium">{value}</p></div>)}</div>
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="space-y-2"><Label>Stage</Label><Select value={form.stage} onValueChange={v => setForm({ ...form, stage: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PROJECT_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label htmlFor="p-owner">Owner</Label><Input id="p-owner" value={form.owner_name} maxLength={200} onChange={e => setForm({ ...form, owner_name: e.target.value })} placeholder="Name or team" /></div>
      <div className="space-y-2 sm:col-span-2"><Label htmlFor="p-next">Next action</Label><Input id="p-next" value={form.next_action} maxLength={500} onChange={e => setForm({ ...form, next_action: e.target.value })} /></div>
      <div className="space-y-2"><Label htmlFor="p-conf">Confidence</Label><Input id="p-conf" value={form.confidence} maxLength={300} onChange={e => setForm({ ...form, confidence: e.target.value })} /></div>
      <div className="space-y-2"><Label htmlFor="p-block">Key blocker</Label><Input id="p-block" value={form.blocker} maxLength={500} onChange={e => setForm({ ...form, blocker: e.target.value })} /></div>
      <div className="space-y-2 sm:col-span-2"><Label htmlFor="p-notes">Notes & missing information</Label><Textarea id="p-notes" value={form.notes} maxLength={10000} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
    </div>
    <div className="mt-4 flex flex-wrap gap-2"><Button onClick={save}><Save />Save updates</Button><Button variant="outline" onClick={() => setBrief(true)}><FileText />Generate feasibility brief</Button><Button variant="ghost" onClick={() => setContact(project.name)}><MessageCircle />Validate with the team</Button></div>
    <Tabs defaultValue="activity" className="mt-10"><TabsList><TabsTrigger value="activity">Activity</TabsTrigger><TabsTrigger value="assumptions">Assumptions ({list(project.assumptions).length})</TabsTrigger><TabsTrigger value="evidence">Evidence ({list(project.evidence).length})</TabsTrigger><TabsTrigger value="comments">Comments ({list(project.comments).length})</TabsTrigger></TabsList>
      <TabsContent value="activity"><Log entries={list(project.activity)} empty="No activity yet." /></TabsContent>
      <TabsContent value="assumptions"><AddEntry label="Add assumption" placeholder="e.g. Buyer demand 400 m³/day, from site manager call" onAdd={t => addLog("assumptions", t)} /><Log entries={list(project.assumptions)} empty="No assumptions logged. Record each figure you rely on and where it came from." /></TabsContent>
      <TabsContent value="evidence"><AddEntry label="Add evidence" placeholder="e.g. Operator confirmed spare tertiary capacity (email, link)" onAdd={t => addLog("evidence", t)} /><Log entries={list(project.evidence)} empty="No evidence logged yet." /></TabsContent>
      <TabsContent value="comments"><AddEntry label="Add comment" placeholder="Write a comment" onAdd={t => addLog("comments", t)} /><Log entries={list(project.comments)} empty="No comments yet." /></TabsContent>
    </Tabs>
  </section></div>}
  </main>
  <Dialog open={brief} onOpenChange={setBrief}><DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>Review your feasibility brief</DialogTitle><DialogDescription>Indicative screening only. An engineer has not reviewed this brief.</DialogDescription></DialogHeader>{snapshot && <><div className="space-y-4 text-sm"><p><strong>Opportunity:</strong> {snapshot.name}</p><p><strong>Volume:</strong> {Math.round(snapshot.volume).toLocaleString("en-GB")} m³/day · {form.confidence}</p><p><strong>Cost:</strong> {snapshot.cost}</p><p><strong>Key blocker:</strong> {form.blocker}</p><p><strong>Next action:</strong> {form.next_action}</p><p className="text-muted-foreground">It is not a permit or a final engineering document.</p></div><div className="flex flex-wrap gap-2"><Button onClick={download}><Download />Download indicative brief</Button><Button variant="outline" onClick={() => { setBrief(false); setContact(`Engineer-reviewed Deal File: ${snapshot.name}`); }}>Request engineer review</Button></div></>}</DialogContent></Dialog>
  </div>;
}

function AddEntry({ label, placeholder, onAdd }: { label: string; placeholder: string; onAdd: (t: string) => void }) {
  const [t, setT] = useState("");
  return <form className="mt-4 flex gap-2" onSubmit={e => { e.preventDefault(); const v = t.trim(); if (!v) return; onAdd(v.slice(0, 2000)); setT(""); }}><Input aria-label={label} value={t} maxLength={2000} onChange={e => setT(e.target.value)} placeholder={placeholder} /><Button type="submit" variant="outline"><Plus />{label}</Button></form>;
}
function Log({ entries, empty }: { entries: Entry[]; empty: string }) {
  if (!entries.length) return <p className="mt-4 text-sm text-muted-foreground">{empty}</p>;
  return <ul className="mt-4 space-y-3 text-sm">{[...entries].reverse().map((a, i) => <li key={i} className="flex flex-wrap justify-between gap-2 border-b pb-3"><span className="whitespace-pre-wrap">{a.text}</span><span className="text-xs text-muted-foreground">{a.author ? `${a.author} · ` : ""}{new Date(a.date).toLocaleDateString("en-GB")}</span></li>)}</ul>;
}
