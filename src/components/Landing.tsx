import { useDeferredValue, useMemo, useState } from "react";
import { ArrowRight, Building2, ChevronDown, Factory, Layers3, Search, MapPin, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmt, useCompanies, useMatches, useProjects } from "@/lib/queries";
import { normalize } from "@/lib/sectors";
import { useApp, type Mode } from "@/lib/state";
import { useWorkspace } from "@/lib/workspace";

const TASKS: { mode: Mode; label: string }[] = [{ mode: "q5", label: "See future water costs with site-specific drought scenarios" }, { mode: "q3", label: "Connect or build your own water reuse system" }, { mode: "q4", label: "Share cost with neighbours" }, { mode: "q1", label: "Find buyers for reusable treated water" }, { mode: "q2", label: "Find supply for reusable treated water" }, { mode: "all", label: "Explore all data" }];
export function QuestionBar() {
  const { mode, setMode, select, selection, setSearchOpen, panelOpen, setPanelOpen } = useApp();
  const { setContact } = useWorkspace();
  const { filtered, siteById } = useMatches();
  const pick = (m: Mode) => { setMode(m); if (m === "q1") { const top = filtered[0]; const site = top ? siteById.get(top.siteId) : undefined; if (site) select({ kind: site.kind, id: site.id }); else setSearchOpen(true); } else if (m === "q4") select({ kind: "region", id: "catalonia" }); else if (m !== "all" && selection?.kind !== "company") setSearchOpen(true); };
  return <div className="pointer-events-none absolute left-3 right-3 top-4 z-20 flex items-start justify-between gap-3 md:left-5 md:right-5">
    <div className="pointer-events-auto flex max-w-full items-center gap-2"><div className="panel rounded-lg px-3 py-2 shadow-map-panel"><p className="mb-1 text-[11px] text-muted-foreground">What do you want to do?</p><Select value={mode} onValueChange={v => pick(v as Mode)}><SelectTrigger className="h-7 w-[260px] max-w-[calc(100vw-130px)] border-0 px-0 text-xs font-medium shadow-none"><SelectValue /></SelectTrigger><SelectContent>{TASKS.map(t => <SelectItem key={t.mode} value={t.mode}>{t.label}</SelectItem>)}</SelectContent></Select></div><Button variant="outline" aria-label="Layers and filters" aria-expanded={panelOpen} className="h-12 shadow-map-panel" onClick={() => setPanelOpen(!panelOpen)}><Layers3 /><span className="hidden sm:inline text-xs">Layers</span><ChevronDown className="hidden sm:block" /></Button></div>
    <Button className="pointer-events-auto hidden md:inline-flex lg:hidden" variant="outline" size="icon" aria-label="Talk to the team" onClick={() => setContact("")}><MessageCircle /></Button>
  </div>;
}
export function CompanySearch() {
  const { searchOpen, setSearchOpen, select } = useApp();
  const c = useCompanies(); const { sites } = useMatches(); const projects = useProjects();
  const [q, setQ] = useState("");
  // Normalised once per data load; typing then only runs a substring scan, deferred so input stays responsive.
  const index = useMemo(() => [...sites, ...(c.data?.features ?? [])].map(x => ({ id: x.id, name: x.name, location: x.municipi, kind: x.kind, key: normalize(`${x.name} ${x.municipi}`) })), [c.data, sites]);
  const dq = useDeferredValue(q);
  const results = useMemo(() => { const k = normalize(dq); if (k.length < 2) return []; const out: typeof index = []; for (const x of index) { if (x.key.includes(k)) out.push(x); if (out.length === 45) break; } return out; }, [dq, index]);
  const notices = (projects.data?.features ?? []).filter(p => q.length >= 2 && normalize(`${p.buyer} ${p.place} ${p.object}`).includes(normalize(q))).slice(0, 5);
  const choose = (kind: "wwtp" | "regen" | "company", id: string) => { setSearchOpen(false); select({ kind, id }); };
  return <Dialog open={searchOpen} onOpenChange={setSearchOpen}><DialogContent className="max-w-xl gap-0 p-0"><DialogTitle className="sr-only">Search a company, plant, city or project</DialogTitle><DialogDescription className="sr-only">Find public-data opportunities by name or municipality.</DialogDescription><div className="flex items-center gap-3 border-b p-4"><Search className="h-5 w-5 shrink-0 text-primary" /><Input autoFocus aria-label="Search opportunities" placeholder="Company, plant, city or project…" value={q} onChange={e => setQ(e.target.value)} className="h-10 border-0 bg-transparent shadow-none" /></div><div className="max-h-[60dvh] overflow-y-auto p-2">
    {q.length < 2 && <div className="px-3 py-5"><p className="text-sm font-medium">Find your starting point</p><p className="mt-1 text-xs text-muted-foreground">{fmt.format(sites.length)} plants · {fmt.format(c.data?.features.length ?? 0)} companies</p><div className="mt-4 flex gap-2">{["Barcelona", "Tarragona", "Madrid"].map(city => <Button key={city} variant="secondary" size="sm" onClick={() => setQ(city)}><MapPin />{city}</Button>)}</div></div>}
    {q.length >= 2 && !results.length && !notices.length && <p className="p-4 text-sm text-muted-foreground">{c.isLoading ? "Loading public data…" : "No results found. Try a different name or municipality."}</p>}
    {results.map(x => <Button key={`${x.kind}-${x.id}`} variant="ghost" className="h-auto w-full justify-start py-3 text-left whitespace-normal" onClick={() => choose(x.kind, x.id)}>{x.kind === "company" ? <Building2 className="text-muted-foreground" /> : <Factory className="text-primary" />}<span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{x.name}</span><span className="mt-1 block text-xs text-muted-foreground">{x.location} · {x.kind === "company" ? "Company" : x.kind === "regen" ? "Water recycling plant" : "Treatment plant"}</span></span><ArrowRight className="text-muted-foreground" /></Button>)}
    {notices.map(p => <Button key={p.id} asChild variant="ghost" className="h-auto w-full justify-start whitespace-normal py-3"><a href={p.url ?? "https://contractaciopublica.cat"} target="_blank" rel="noreferrer"><Factory /><span><span className="block text-sm">{p.buyer}</span><span className="text-xs text-muted-foreground">{p.place} · Procurement project</span></span></a></Button>)}
  </div></DialogContent></Dialog>;
}
