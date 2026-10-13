import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Mail, Send, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/lib/workspace";
import { enquirySchema } from "@/lib/project-model";
import { ROLES } from "./AuthForms";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";

const TOPICS = ["Evaluate an opportunity", "Screen a portfolio", "Add private data", "Discuss plans", "Partner with Venaqua"];

/** Calm, non-blocking panel for gated workspace actions; the map stays usable behind it. */
function GatePanel() {
  const { authOpen, setAuthOpen, gateRedirect, user } = useWorkspace();
  if (!authOpen || user) return null;
  return <aside role="dialog" aria-labelledby="gate-title" className="fixed bottom-5 left-1/2 z-50 w-[min(440px,calc(100vw-24px))] -translate-x-1/2 rounded-lg border bg-card p-5 shadow-map-panel">
    <div className="flex items-start justify-between gap-3"><h2 id="gate-title" className="text-base font-semibold">Turn this opportunity into a project decision.</h2><Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label="Close" onClick={() => setAuthOpen(false)}><X /></Button></div>
    <p className="mt-2 text-sm text-muted-foreground">Create a Venaqua workspace to save opportunities, compare evidence, track next actions and build your reuse pipeline.</p>
    <div className="mt-4 flex flex-wrap gap-2">
      <Button asChild size="sm" onClick={() => setAuthOpen(false)}><Link to="/signup" search={{ redirect: gateRedirect }}>Create free workspace</Link></Button>
      <Button asChild size="sm" variant="outline" onClick={() => setAuthOpen(false)}><Link to="/login" search={{ redirect: gateRedirect }}>Log in</Link></Button>
      <Button size="sm" variant="ghost" onClick={() => setAuthOpen(false)}>Continue exploring</Button>
    </div>
  </aside>;
}

export function WorkspaceDialogs() {
  const { contact, setContact } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [role, setRole] = useState("");
  const [topic, setTopic] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const close = () => { setContact(null); setSent(false); setMessage(""); };
  return <>
    <GatePanel />
    <Dialog open={contact !== null} onOpenChange={b => { if (!b) close(); }}><DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto"><DialogHeader><DialogTitle>Talk to the team</DialogTitle><DialogDescription>Venaqua · support@venaqua.com</DialogDescription></DialogHeader>
    {sent ? <div className="space-y-4 py-4"><h3 className="text-lg font-semibold">Thanks — the Venaqua team will review your request.</h3><p className="text-sm text-muted-foreground">If you'd like, you can also send it straight to support@venaqua.com by email.</p><div className="flex flex-wrap gap-2"><Button asChild variant="outline"><a href={emailDraft}><Mail />Open email draft</a></Button><Button variant="ghost" onClick={close}>Close</Button></div></div> : <form className="space-y-4" onSubmit={async e => {
      e.preventDefault(); setBusy(true); setMessage("");
      const f = new FormData(e.currentTarget);
      const note = String(f.get("message") ?? "").trim();
      const parsed = enquirySchema.safeParse({ name: f.get("name"), email: f.get("email"), organisation: f.get("organisation"), role, opportunity: contact ?? "", help: topic ? `${topic}${note ? `\n\n${note}` : ""}` : "" });
      if (!parsed.success) { setMessage("Please complete name, organisation, a valid work email and what you need help with."); setBusy(false); return; }
      const { error } = await supabase.from("project_enquiries").insert(parsed.data);
      if (error) setMessage("Could not send your request. Email support@venaqua.com instead.");
      else { const p = parsed.data; setEmailDraft(`mailto:support@venaqua.com?subject=${encodeURIComponent(`Venaqua: ${topic}${p.opportunity ? ` · ${p.opportunity}` : ""}`)}&body=${encodeURIComponent(`${p.name}\n${p.email}\n${p.organisation} · ${p.role}\n\n${p.help}`)}`); setSent(true); }
      setBusy(false);
    }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1"><Label htmlFor="contact-name">Name</Label><Input id="contact-name" name="name" required maxLength={100} autoComplete="name" /></div>
        <div className="space-y-1"><Label htmlFor="contact-organisation">Organisation</Label><Input id="contact-organisation" name="organisation" required maxLength={200} autoComplete="organization" /></div>
        <div className="space-y-1"><Label htmlFor="contact-email">Work email</Label><Input id="contact-email" name="email" type="email" required maxLength={255} autoComplete="email" /></div>
        <div className="space-y-1"><Label>Role</Label><Select value={role} onValueChange={setRole}><SelectTrigger aria-label="Role"><SelectValue placeholder="Choose" /></SelectTrigger><SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
      </div>
      <div className="space-y-1"><Label>What do you need help with?</Label><Select value={topic} onValueChange={setTopic}><SelectTrigger aria-label="What do you need help with?"><SelectValue placeholder="Choose a topic" /></SelectTrigger><SelectContent>{TOPICS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
      {contact && <p className="text-xs text-muted-foreground">About: {contact}</p>}
      <div className="space-y-1"><Label htmlFor="contact-message">Message (optional)</Label><Textarea id="contact-message" name="message" maxLength={2800} rows={4} /></div>
      <Button className="w-full" type="submit" disabled={busy}><Send />{busy ? "Sending…" : "Send request"}</Button>
    </form>}{message && <p role="status" className="text-sm text-destructive">{message}</p>}
    </DialogContent></Dialog>
  </>;
}
