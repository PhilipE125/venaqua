import { useState } from "react";
import { Bell, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { EvidenceEntry } from "@/lib/project-model";
import { useWorkspace } from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function evidenceOf(p: Tables<"reuse_projects">): EvidenceEntry[] {
  return Array.isArray(p.evidence) ? (p.evidence as unknown as EvidenceEntry[]) : [];
}

export function ProjectEvidence({ project, onSaved }: { project: Tables<"reuse_projects">; onSaved: () => void }) {
  const [text, setText] = useState("");
  const [source, setSource] = useState("");
  const [kind, setKind] = useState<EvidenceEntry["kind"]>("confirmed");
  const list = evidenceOf(project);
  async function add() {
    if (!text.trim()) return;
    const entry: EvidenceEntry = { text: text.trim().slice(0, 500), source: source.trim().slice(0, 300), kind, date: new Date().toISOString() };
    const activity = Array.isArray(project.activity) ? project.activity : [];
    const { error } = await supabase.from("reuse_projects").update({ evidence: [...list, entry], activity: [...activity, { text: `Evidence logged · ${kind}`, date: entry.date }] }).eq("id", project.id);
    if (error) toast.error("Could not save evidence."); else { setText(""); setSource(""); toast.success("Evidence logged"); onSaved(); }
  }
  return <div className="mt-8">
    <h3 className="mb-3 text-sm font-semibold">Evidence log</h3>
    <ul className="mb-4 space-y-2 text-sm">
      {list.length === 0 && <li className="text-muted-foreground">Nothing logged yet. Record what has been confirmed and where it came from.</li>}
      {list.map((e, i) => <li key={i} className="flex flex-wrap items-start justify-between gap-2 border-b pb-2"><span><Badge variant="outline" className="mr-2 capitalize">{e.kind}</Badge>{e.text}{e.source && <span className="text-muted-foreground"> · {e.source}</span>}</span><span className="text-xs text-muted-foreground">{new Date(e.date).toLocaleDateString("en-GB")}</span></li>)}
    </ul>
    <div className="grid gap-2 sm:grid-cols-[140px_1fr_1fr_auto]">
      <Select value={kind} onValueChange={v => setKind(v as EvidenceEntry["kind"])}><SelectTrigger aria-label="Evidence type"><SelectValue /></SelectTrigger><SelectContent>{(["confirmed", "measured", "modelled", "estimated"] as const).map(k => <SelectItem key={k} value={k} className="capitalize">{k}</SelectItem>)}</SelectContent></Select>
      <Input value={text} maxLength={500} onChange={e => setText(e.target.value)} placeholder="e.g. Plant confirms 4,000 m³/day spare capacity" aria-label="Evidence" />
      <Input value={source} maxLength={300} onChange={e => setSource(e.target.value)} placeholder="Source (email, report, call…)" aria-label="Source" />
      <Button variant="outline" onClick={add}><Plus />Log</Button>
    </div>
  </div>;
}

export function AlertsList() {
  const { alerts, refresh } = useWorkspace();
  const unread = alerts.filter(a => !a.read);
  async function markRead() {
    if (!unread.length) return;
    await supabase.from("project_alerts").update({ read: true }).in("id", unread.map(a => a.id));
    refresh();
  }
  return <section className="mb-8 rounded-xl border bg-card p-4">
    <div className="flex items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-sm font-semibold"><Bell className="h-4 w-4" />Alerts {unread.length > 0 && <Badge>{unread.length} new</Badge>}</h2>{unread.length > 0 && <Button size="sm" variant="ghost" onClick={markRead}>Mark all read</Button>}</div>
    {alerts.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">You'll be alerted here when a project changes stage, owner or gets new evidence.</p> :
      <ul className="mt-3 space-y-1 text-sm">{alerts.slice(0, 6).map(a => <li key={a.id} className={`flex justify-between gap-2 ${a.read ? "text-muted-foreground" : ""}`}><span>{a.text}</span><span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString("en-GB")}</span></li>)}</ul>}
  </section>;
}
