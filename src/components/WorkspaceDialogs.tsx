import { useState } from "react";
import { Mail, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useWorkspace } from "@/lib/workspace";
import { enquirySchema } from "@/lib/project-model";
import { ENQUIRIES, type EnquiryTopic } from "@/content/venaqua";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";

export function WorkspaceDialogs() {
  const { authOpen, setAuthOpen, contact, setContact } = useWorkspace();
  const [signup, setSignup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [emailDraft, setEmailDraft] = useState("");
  const productEnquiry = contact && contact in ENQUIRIES ? ENQUIRIES[contact as EnquiryTopic] : undefined;
  return <>
    <Dialog open={authOpen} onOpenChange={b => { setAuthOpen(b); setMessage(""); }}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>{signup ? "Create your project account" : "Your project workspace"}</DialogTitle><DialogDescription>Keep your shortlist, assumptions and next actions private.</DialogDescription></DialogHeader>
      <Button variant="outline" disabled={busy} onClick={async () => { setBusy(true); const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin }); if (r.error) setMessage(r.error.message); else if (!r.redirected) setAuthOpen(false); setBusy(false); }}>Continue with Google</Button>
      <p className="text-center text-xs text-muted-foreground">or use your email</p>
      <form className="space-y-4" onSubmit={async e => { e.preventDefault(); setBusy(true); setMessage(""); const f = new FormData(e.currentTarget); const email = String(f.get("email")); const password = String(f.get("password")); const r = signup ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } }) : await supabase.auth.signInWithPassword({ email, password }); if (r.error) setMessage(r.error.message); else if (r.data.session) setAuthOpen(false); else setMessage("Check your email to confirm your account."); setBusy(false); }}>
        <div className="space-y-1"><Label htmlFor="login-email">Email</Label><Input id="login-email" name="email" type="email" required autoComplete="email" /></div>
        <div className="space-y-1"><Label htmlFor="login-password">Password</Label><Input id="login-password" name="password" type="password" required minLength={8} autoComplete={signup ? "new-password" : "current-password"} /></div>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Please wait…" : signup ? "Create account" : "Sign in"}</Button>
      </form>
      <Button variant="link" onClick={() => setSignup(!signup)}>{signup ? "Already have an account? Sign in" : "New here? Create an account"}</Button>
      <Button variant="ghost" size="sm" onClick={async () => { const email = document.querySelector<HTMLInputElement>("#login-email")?.value; if (!email) { setMessage("Enter your email first."); return; } const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" }); setMessage(error ? error.message : "Check your email for a password reset link."); }}>Forgot password?</Button>
      {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
    </DialogContent></Dialog>
    <Dialog open={contact !== null} onOpenChange={b => { if (!b) { setContact(null); setSent(false); setMessage(""); } }}><DialogContent className="max-h-[90dvh] overflow-y-auto max-w-lg"><DialogHeader><DialogTitle>{productEnquiry?.title ?? "Move your project forward"}</DialogTitle><DialogDescription>{productEnquiry?.description ?? "Talk to the Venaqua team · support@venaqua.com"}</DialogDescription></DialogHeader>
    {sent ? <div className="space-y-4 py-4"><h3 className="text-lg font-semibold">Your enquiry is saved.</h3><p className="text-sm text-muted-foreground">Open the email draft to send it directly to support@venaqua.com. No email has been sent automatically.</p><Button asChild><a href={emailDraft}><Mail />Send to the team by email</a></Button></div> : <form className="space-y-4" onSubmit={async e => { e.preventDefault(); setBusy(true); setMessage(""); const f = new FormData(e.currentTarget); const parsed = enquirySchema.safeParse(Object.fromEntries(f)); if (!parsed.success) { setMessage("Please complete all required fields with a valid email."); setBusy(false); return; } const { error } = await supabase.from("project_enquiries").insert(parsed.data); if (error) setMessage("Could not save your enquiry. Email support@venaqua.com instead."); else { const p = parsed.data; setEmailDraft(`mailto:support@venaqua.com?subject=${encodeURIComponent(`Venaqua: ${p.opportunity || "Project enquiry"}`)}&body=${encodeURIComponent(`${p.name}\n${p.email}\n${p.organisation} · ${p.role}\n\nOpportunity: ${p.opportunity}\n\n${p.help}`)}`); setSent(true); } setBusy(false); }}>
      <div className="grid grid-cols-2 gap-3">{[["name", "Name"], ["organisation", "Organisation"], ["email", "Email"], ["role", "Your role"]].map(([key, label]) => <div key={key} className="space-y-1"><Label htmlFor={`contact-${key}`}>{label}</Label><Input id={`contact-${key}`} name={key} type={key === "email" ? "email" : "text"} required={key !== "role"} maxLength={key === "email" ? 255 : key === "name" ? 100 : 200} /></div>)}</div>
      <div className="space-y-1"><Label htmlFor="contact-opportunity">Project / opportunity</Label><Input id="contact-opportunity" name="opportunity" defaultValue={productEnquiry ? `${productEnquiry.title} [${contact}]` : contact ?? ""} maxLength={500} /></div>
      <div className="space-y-1"><Label htmlFor="contact-help">What do you need help with?</Label><Textarea id="contact-help" name="help" required maxLength={3000} placeholder={productEnquiry?.placeholder ?? "Validate supply, assess a connection, request an engineer-reviewed Investment Case…"} rows={4} /></div>
      <p className="text-xs text-muted-foreground">Your details are saved privately for the team. The next step opens an email draft for you to send.</p>
      <Button className="w-full" type="submit" disabled={busy}><Send />{busy ? "Saving…" : productEnquiry ? "Prepare enquiry" : "Prepare project enquiry"}</Button>
    </form>}{message && <p role="status" className="text-sm text-destructive">{message}</p>}
    </DialogContent></Dialog>
  </>;
}