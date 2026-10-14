import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, ExternalLink, RotateCcw } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkspace } from "@/lib/workspace";
import dealData from "@/data/dealflow-deals.json";
import { CASE_DISCLAIMER, INVESTMENT_CASES, type InvestmentCase, type Verdict } from "@/data/investment-cases";
import {
  filterDeals, formatEur, KIND_LABELS, KINDS, SCOPE_LABELS, SCORE_LABELS, SECTOR_LABELS, STAGE_LABELS, STAGES,
  type Deal, type DealFilters, type Kind, type Stage,
} from "@/lib/deals";

const DEALS = (dealData as unknown as { deals: Deal[] }).deals;
const REGIONS = [...new Set(DEALS.map((d) => d.region))].sort();
// Demo build: every deal unlocked. Plan-gated access comes with the database step.
const DEMO_UNLOCK = true;

type Search = { q?: string | undefined; region?: string | undefined; kind?: string | undefined; stage?: string | undefined; min_score?: number | undefined; actionable?: string | undefined; deadline?: number | undefined; verified?: string | undefined; view?: string | undefined; deal?: string | undefined };
const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
const num = (v: unknown) => (v === undefined || v === "" ? undefined : Number.isFinite(Number(v)) ? Number(v) : undefined);

export const Route = createFileRoute("/deal-flow")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: str(s["q"]), region: str(s["region"]), kind: str(s["kind"]), stage: str(s["stage"]), min_score: num(s["min_score"]),
    actionable: str(s["actionable"]), deadline: num(s["deadline"]), verified: str(s["verified"]), view: str(s["view"]), deal: str(s["deal"]),
  }),
  head: () => ({
    meta: [
      { title: "Venaqua · Deal Flow: reuse investment cases in Spain" },
      { name: "description", content: "Filter sourced, scored wastewater-reuse tenders, programmes and projects across Spain, with value, volume, deadlines and sources." },
      { property: "og:title", content: "Venaqua Deal Flow" },
      { property: "og:description", content: "Investment cases, early signals and tenders for water reuse in Spain." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DealFlow,
});

const VALUE_BASIS: Record<Deal["value_basis"], string> = { tender_budget: "Tender budget", award: "Award", investment_announced: "Announced investment", plan_total: "Plan total", estimate: "Estimate", unknown: "Unknown" };
const VERIF: Record<Deal["verification_status"], string> = { verified: "Verified", source_linked: "Source-linked", ai_extracted: "AI-extracted" };
const scoreClass = (s: number) => (s >= 80 ? "bg-primary text-primary-foreground" : s >= 70 ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground");
const daysTo = (d: string | null) => (d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000) : null);

function toFilters(s: Search): DealFilters {
  const strip = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as DealFilters;
  return strip({
    q: s.q, region: s.region?.split(","), kind: s.kind?.split(",") as Kind[] | undefined, stage: s.stage?.split(",") as Stage[] | undefined,
    min_score: s.min_score, actionable: s.actionable !== "0", deadline_within_days: s.deadline, verified_only: s.verified === "1",
  });
}

function csv(rows: Deal[]) {
  const head = ["id", "name", "region", "province", "kind", "stage", "value_eur", "value_basis", "volume_hm3", "deadline", "buyer", "opportunity_score", "sources"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const body = rows.map((d) => [d.id, d.name, d.region, d.province, d.kind, d.stage, d.value_eur, d.value_basis, d.volume_hm3, d.deadline, d.buyer, d.opportunity_score, d.sources.map((x) => x.url).join(" ")].map(esc).join(","));
  const url = URL.createObjectURL(new Blob([[head.join(","), ...body].join("\n")], { type: "text/csv" }));
  const a = document.createElement("a"); a.href = url; a.download = "venaqua-reuse-pipeline.csv"; a.click(); URL.revokeObjectURL(url);
}

function Chips<T extends string>({ all, labels, value, onChange }: { all: readonly T[]; labels: Record<T, string>; value: T[]; onChange: (v: T[]) => void }) {
  return <div className="flex flex-wrap gap-1">{all.map((k) => {
    const on = value.includes(k);
    return <button key={k} onClick={() => onChange(on ? value.filter((x) => x !== k) : [...value, k])} aria-pressed={on} className={`rounded-full border px-2 py-0.5 text-[11px] ${on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{labels[k]}</button>;
  })}</div>;
}

function DealFlow() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/deal-flow" });
  const set = (patch: Partial<Search>) => navigate({ search: (p: Search) => ({ ...p, ...patch }), replace: true });
  const f = toFilters(search);
  const rows = useMemo(() => filterDeals(DEALS, f).sort((a, b) => b.opportunity_score - a.opportunity_score), [search]); // eslint-disable-line react-hooks/exhaustive-deps
  const [sort, setSort] = useState<"score" | "value" | "deadline">("score");
  const sorted = useMemo(() => [...rows].sort((a, b) => sort === "value" ? (b.value_eur ?? -1) - (a.value_eur ?? -1) : sort === "deadline" ? (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999") : b.opportunity_score - a.opportunity_score), [rows, sort]);
  const selected = DEALS.find((d) => d.id === search.deal);
  const totalValue = rows.reduce((s, d) => s + (d.value_eur ?? 0), 0);
  const volume = rows.reduce((s, d) => s + (d.volume_hm3 ?? 0), 0);
  const soon = rows.filter((d) => { const n = daysTo(d.deadline); return n != null && n >= 0 && n <= 30; }).length;
  const list = (v?: string) => v?.split(",").filter(Boolean) ?? [];
  const join = (v: string[]) => (v.length ? v.join(",") : undefined);

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-5">
        <p className="label-caps text-primary">Deal Flow</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Shared reuse infrastructure in Spain, costed before it is tendered</h1>
          {DEMO_UNLOCK && <Badge variant="secondary">Demo: everything unlocked</Badge>}
        </div>
        <Tabs defaultValue="cases" className="mt-6">
          <TabsList><TabsTrigger value="cases">Investment cases</TabsTrigger><TabsTrigger value="signals">Early signals</TabsTrigger><TabsTrigger value="deals">Tenders</TabsTrigger></TabsList>
          <TabsContent value="cases"><CasesTab /></TabsContent>
          <TabsContent value="signals"><SignalsTab onOpen={(id) => set({ deal: id })} /></TabsContent>
          <TabsContent value="deals">
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              {[["Actionable deals", String(rows.filter((d) => d.is_actionable).length)], ["Total known value", formatEur(totalValue || null)], ["Reclaimed water", `${volume.toFixed(1)} hm³/yr`], ["Deadlines in 30 days", String(soon)]].map(([l, v]) => (
                <div key={l} className="rounded-xl border bg-card p-4"><p className="label-caps">{l}</p><p className="tnum mt-1 text-xl font-semibold">{v}</p></div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Values may be budgets, awarded amounts, announced figures or estimates. Each value includes its basis.</p>

            <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
              <aside className="space-y-4 text-xs">
                <Input placeholder="Search name, buyer, place…" value={search.q ?? ""} onChange={(e) => set({ q: e.target.value || undefined })} />
                <div><p className="label-caps mb-1.5">Region</p><Chips all={REGIONS} labels={Object.fromEntries(REGIONS.map((r) => [r, r]))} value={list(search.region)} onChange={(v) => set({ region: join(v) })} /></div>
                <div><p className="label-caps mb-1.5">Deal type</p><Chips all={KINDS} labels={KIND_LABELS} value={list(search.kind) as Kind[]} onChange={(v) => set({ kind: join(v) })} /></div>
                <div><p className="label-caps mb-1.5">Stage</p><Chips all={STAGES} labels={STAGE_LABELS} value={list(search.stage) as Stage[]} onChange={(v) => set({ stage: join(v) })} /></div>
                <div><p className="label-caps mb-1.5">Minimum score: <span className="tnum">{search.min_score ?? 0}</span></p><input type="range" min={0} max={100} step={5} value={search.min_score ?? 0} onChange={(e) => set({ min_score: Number(e.target.value) || undefined })} className="w-full accent-primary" aria-label="Minimum opportunity score" /></div>
                <div><p className="label-caps mb-1.5">Deadline within</p><div className="flex gap-1">{[7, 30, 60, 90].map((n) => <button key={n} onClick={() => set({ deadline: search.deadline === n ? undefined : n })} className={`rounded-full border px-2 py-0.5 ${search.deadline === n ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{n} days</button>)}</div></div>
                <label className="flex items-center justify-between"><span>Actionable only</span><Switch checked={search.actionable !== "0"} onCheckedChange={(v) => set({ actionable: v ? undefined : "0" })} /></label>
                <label className="flex items-center justify-between"><span>Verified only</span><Switch checked={search.verified === "1"} onCheckedChange={(v) => set({ verified: v ? "1" : undefined })} /></label>
                <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => navigate({ search: {}, replace: true })}><RotateCcw />Reset</Button><Button size="sm" variant="outline" onClick={() => csv(sorted)}><Download />CSV</Button></div>
              </aside>

              <section className="min-w-0">
                <Tabs value={search.view ?? "table"} onValueChange={(v) => set({ view: v === "table" ? undefined : v })}>
                  <div className="flex items-center justify-between gap-2">
                    <TabsList><TabsTrigger value="table">Table</TabsTrigger><TabsTrigger value="board">Board</TabsTrigger></TabsList>
                    <span className="tnum text-xs text-muted-foreground">{rows.length} of {DEALS.length} deals</span>
                  </div>
                  {!rows.length ? (
                    <div className="mt-4 rounded-xl border bg-card p-8 text-center text-sm"><p>No deals match these filters.</p><Button className="mt-3" size="sm" onClick={() => navigate({ search: {}, replace: true })}>Reset filters</Button></div>
                  ) : <>
                    <TabsContent value="table">
                      <div className="mt-3 overflow-x-auto rounded-xl border bg-card">
                        <table className="w-full min-w-[760px] text-sm">
                          <thead><tr className="border-b text-left text-xs text-muted-foreground">
                            <th className="px-3 py-2 font-medium">Name</th><th className="px-3 py-2 font-medium">Region</th><th className="px-3 py-2 font-medium">Type</th><th className="px-3 py-2 font-medium">Stage</th>
                            <th className="px-3 py-2 font-medium"><button onClick={() => setSort("value")}>Value</button></th><th className="px-3 py-2 font-medium">hm³/yr</th>
                            <th className="px-3 py-2 font-medium"><button onClick={() => setSort("deadline")}>Deadline</button></th><th className="px-3 py-2 font-medium"><button onClick={() => setSort("score")}>Score</button></th>
                          </tr></thead>
                          <tbody>{sorted.map((d) => { const n = daysTo(d.deadline); return (
                            <tr key={d.id} className="cursor-pointer border-b last:border-0 hover:bg-muted/50" onClick={() => set({ deal: d.id })}>
                              <td className="px-3 py-2.5 font-medium">{d.name}</td><td className="px-3 py-2.5 text-muted-foreground">{d.region}</td>
                              <td className="px-3 py-2.5 text-muted-foreground">{KIND_LABELS[d.kind]}</td><td className="px-3 py-2.5">{STAGE_LABELS[d.stage]}</td>
                              <td className="tnum px-3 py-2.5" title={VALUE_BASIS[d.value_basis]}>{formatEur(d.value_eur)}</td><td className="tnum px-3 py-2.5">{d.volume_hm3 ?? "-"}</td>
                              <td className={`tnum px-3 py-2.5 ${n == null ? "text-muted-foreground" : n < 0 ? "text-muted-foreground line-through" : n <= 30 ? "font-medium text-destructive" : ""}`}>{d.deadline ?? "-"}</td>
                              <td className="px-3 py-2.5"><span className={`tnum rounded-full px-2 py-0.5 text-xs font-semibold ${scoreClass(d.opportunity_score)}`}>{Math.round(d.opportunity_score)}</span></td>
                            </tr>); })}</tbody>
                        </table>
                      </div>
                    </TabsContent>
                    <TabsContent value="board">
                      <div className="mt-3 flex gap-3 overflow-x-auto pb-2">{STAGES.filter((s) => s !== "tender_closed").map((s) => (
                        <div key={s} className="w-56 shrink-0 rounded-xl border bg-muted/40 p-2">
                          <p className="label-caps px-1 pb-2">{STAGE_LABELS[s]} <span className="tnum">· {rows.filter((d) => d.stage === s).length}</span></p>
                          <div className="space-y-2">{rows.filter((d) => d.stage === s).map((d) => (
                            <button key={d.id} onClick={() => set({ deal: d.id })} className="block w-full rounded-lg border bg-card p-2.5 text-left text-xs hover:border-primary/60">
                              <p className="font-medium leading-snug">{d.name}</p>
                              <p className="mt-1 flex justify-between text-muted-foreground"><span>{d.province}</span><span className="tnum font-semibold text-foreground">{Math.round(d.opportunity_score)}</span></p>
                            </button>))}</div>
                        </div>))}</div>
                    </TabsContent>
                  </>}
                </Tabs>
              </section>
            </div>
          </TabsContent>
        </Tabs>
      </main>
      <DealSheet deal={selected} onClose={() => set({ deal: undefined })} />
    </div>
  );
}

function DealSheet({ deal: d, onClose }: { deal?: Deal | undefined; onClose: () => void }) {
  const { setContact } = useWorkspace();
  return (
    <Sheet open={!!d} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {d && <>
          <SheetHeader>
            <div className="flex flex-wrap gap-1.5"><Badge variant="outline">{KIND_LABELS[d.kind]}</Badge><Badge variant="outline">{STAGE_LABELS[d.stage]}</Badge><Badge variant={d.verification_status === "verified" ? "default" : "secondary"}>{VERIF[d.verification_status]}</Badge></div>
            <SheetTitle className="text-left">{d.name}</SheetTitle>
            <SheetDescription className="text-left">{d.municipality}, {d.province} · last verified {d.last_verified}</SheetDescription>
          </SheetHeader>
          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {([
              ["Buyer", d.buyer], ["Water users", d.offtakers], ["Deal model", d.deal_model],
              ["Value", `${formatEur(d.value_eur)} · ${VALUE_BASIS[d.value_basis]}`], ["Volume", d.volume_hm3 != null ? `${d.volume_hm3} hm³/yr · ${d.volume_basis}` : "Unknown"],
              ["Deadline", d.deadline ?? "-"], ["Follow-on expected", d.follow_on_expected ? "Yes" : "No"],
              ["Scope", d.scope.map((s) => SCOPE_LABELS[s]).join(", ")], ["Sectors", d.offtaker_sectors.map((s) => SECTOR_LABELS[s]).join(", ")],
            ] as const).map(([k, v]) => <div key={k}><dt className="label-caps">{k}</dt><dd className="mt-0.5">{v || "-"}</dd></div>)}
          </dl>
          <div className="mt-6 rounded-xl border p-4">
            <div className="flex items-baseline justify-between"><p className="label-caps">Opportunity score</p><span className="tnum text-2xl font-semibold">{Math.round(d.opportunity_score)}</span></div>
            <div className="mt-3 space-y-1.5">{(Object.keys(SCORE_LABELS) as (keyof typeof SCORE_LABELS)[]).map((k) => { const v = d[`score_${k}` as keyof Deal] as number; return (
              <div key={k} className="grid grid-cols-[1fr_90px_16px] items-center gap-2 text-xs"><span>{SCORE_LABELS[k]}</span><span className="h-1.5 rounded-full bg-muted"><span className="block h-full rounded-full bg-primary" style={{ width: `${(v / 5) * 100}%` }} /></span><span className="tnum text-right">{v}</span></div>); })}</div>
            <p className="mt-3 text-[11px] text-muted-foreground">Analyst judgement, 1-5. Weights: reuse impact 25%, buyers 20%, funding 15%, timing 15%, margin 15%, water stress 10%.</p>
          </div>
          {d.notes && <p className="mt-4 text-sm">{d.notes}</p>}
          {d.kind === "tender" && (
            <div className="mt-5 rounded-xl border p-4 text-sm">
              <div className="flex items-center justify-between"><p className="label-caps">Tender Pack</p><Badge variant="secondary">Included</Badge></div>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li><span className="font-medium text-foreground">Bid / no-bid:</span> score {Math.round(d.opportunity_score)} of 100, see the breakdown above.</li>
                <li><span className="font-medium text-foreground">Eligibility:</span> check solvency and classification against the tender documents and your company profile.</li>
                <li><span className="font-medium text-foreground">Documents by envelope:</span> administrative, technical (judgement criteria), economic offer.</li>
                <li><span className="font-medium text-foreground">Deadline:</span> {d.deadline ?? "not published yet"}.</li>
              </ul>
            </div>
          )}
          <p className="label-caps mt-5">Sources</p>
          <ul className="mt-1 space-y-1 text-sm">{d.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">{s.label}<ExternalLink className="h-3 w-3" /></a></li>)}</ul>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button onClick={() => setContact(`Engineer-reviewed case for ${d.id}: ${d.name}`)}>Talk to us about this deal</Button>
            <Button variant="outline" asChild><Link to="/explore">See nearby plants on the map</Link></Button>
          </div>
        </>}
      </SheetContent>
    </Sheet>
  );
}

const VERDICT_CLASS: Record<Verdict, string> = { Strong: "bg-primary text-primary-foreground", Likely: "bg-accent text-accent-foreground", Marginal: "bg-muted text-foreground", Weak: "bg-destructive/15 text-destructive" };
const PENDING = "Pending case file";
const eurM3 = (n: number) => `€${n.toFixed(2)}/m³`;

function CasesTab() {
  const [open, setOpen] = useState<InvestmentCase | null>(null);
  return (
    <div className="mt-4">
      <p className="max-w-3xl text-sm text-muted-foreground">Co-investment opportunities in shared reuse infrastructure (pipe, pumping, storage, treatment) between a treatment plant and the buyers nearby.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {INVESTMENT_CASES.map((c) => (
          <article key={c.id} className="flex flex-col rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div><h3 className="font-semibold leading-snug">{c.name}</h3><p className="text-xs text-muted-foreground">{c.region} · {c.buyers}</p></div>
              {c.verdict ? <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${VERDICT_CLASS[c.verdict]}`}>{c.verdict}</span> : <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">Verdict pending</span>}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              <div><dt className="label-caps">Capex</dt><dd className="tnum mt-0.5">{c.capexEur != null ? formatEur(c.capexEur) : PENDING}</dd></div>
              <div><dt className="label-caps">Payback</dt><dd className="tnum mt-0.5">{c.paybackYears != null ? `~${c.paybackYears} years` : PENDING}</dd></div>
              <div className="col-span-2"><dt className="label-caps">Delivered vs today</dt><dd className="tnum mt-0.5">{c.deliveredEurM3 != null && c.todayEurM3 ? `${eurM3(c.deliveredEurM3)} vs €${c.todayEurM3[0].toFixed(2)} to €${c.todayEurM3[1].toFixed(2)}/m³` : PENDING}</dd></div>
              <div><dt className="label-caps">Yearly saving</dt><dd className="tnum mt-0.5">{c.yearlySavingEur != null ? formatEur(c.yearlySavingEur) : PENDING}</dd></div>
              <div><dt className="label-caps">Shared vs alone</dt><dd className="tnum mt-0.5">{c.sharedVsAlone ? `${eurM3(c.sharedVsAlone.shared)} vs ${eurM3(c.sharedVsAlone.alone)}` : PENDING}</dd></div>
            </dl>
            <p className="mt-3 text-[11px] text-muted-foreground">{CASE_DISCLAIMER}</p>
            <Button size="sm" className="mt-3 self-start" onClick={() => setOpen(c)}>Open</Button>
          </article>
        ))}
      </div>
      <CaseRoom c={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function CaseRoom({ c, onClose }: { c: InvestmentCase | null; onClose: () => void }) {
  const { setContact } = useWorkspace();
  const Section = ({ title, items }: { title: string; items: string[] }) => (
    <div className="mt-5"><p className="label-caps">{title}</p><ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm">{items.map((i) => <li key={i}>{i}</li>)}</ul></div>
  );
  return (
    <Sheet open={!!c} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {c && <>
          <SheetHeader>
            <Badge variant="outline" className="w-fit">Case Room</Badge>
            <SheetTitle className="text-left">{c.name}</SheetTitle>
            <SheetDescription className="text-left">{CASE_DISCLAIMER}</SheetDescription>
          </SheetHeader>
          {c.sharedVsAlone && <p className="mt-4 rounded-lg bg-muted/50 p-3 text-sm">{c.sharedVsAlone.note}: <span className="tnum font-semibold">{eurM3(c.sharedVsAlone.shared)} vs {eurM3(c.sharedVsAlone.alone)}</span></p>}
          <Section title="Parties and roles under RD 1085/2024" items={[`Water producer: ${c.plant} (reclamation and quality at the point of delivery)`, `Users: ${c.buyers} (use in line with the authorised purpose)`, "Basin authority: grants the reuse authorisation or concession"]} />
          <Section title="Permit path" items={["Application to the basin authority with the risk-management plan", "Decision within 12 months; silence means refusal", "Existing facilities must comply by 31 December 2028"]} />
          <Section title="Risk-plan (PGRAR) checklist" items={["System description from source to point of use", "Hazard and risk assessment per use", "Preventive barriers and quality targets", "Monitoring and verification plan", "Incident and communication protocol"]} />
          <Section title="Term-sheet draft" items={["Volume and delivery profile per buyer", "Price per m³ and indexation", "Capex split across pipe, pumping and storage", "Term, take-or-pay and exit terms", "Quality guarantee and liability"]} />
          <Section title="Funding" items={["EU and national water funds", "Plant owner or utility capex", "Buyer contributions in line with their capex share"]} />
          <Section title="Risks" items={["Demand and today's water cost are screening assumptions", "Pipe route and rights of way unconfirmed", "Permit refusal by silence if the file is incomplete"]} />
          <div className="mt-6 flex flex-wrap gap-2">
            <Button onClick={() => setContact("investment_case")}>Talk to us about an engineer-reviewed case</Button>
          </div>
        </>}
      </SheetContent>
    </Sheet>
  );
}

function SignalsTab({ onOpen }: { onOpen: (id: string) => void }) {
  const signals = DEALS.filter((d) => d.stage === "signal" || d.stage === "planning" || d.stage === "study").sort((a, b) => b.opportunity_score - a.opportunity_score);
  return (
    <div className="mt-4">
      <p className="max-w-3xl text-sm text-muted-foreground">Plants facing EU-directive upgrades or RD 1085/2024 deadlines (existing facilities must comply by 31 December 2028), so projects show up before they are tendered.</p>
      <div className="mt-4 overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="px-3 py-2 font-medium">Name</th><th className="px-3 py-2 font-medium">Region</th><th className="px-3 py-2 font-medium">Stage</th><th className="px-3 py-2 font-medium">Value</th><th className="px-3 py-2 font-medium">Score</th></tr></thead>
          <tbody>{signals.map((d) => (
            <tr key={d.id} className="cursor-pointer border-b last:border-0 hover:bg-muted/50" onClick={() => onOpen(d.id)}>
              <td className="px-3 py-2.5 font-medium">{d.name}</td><td className="px-3 py-2.5 text-muted-foreground">{d.region}</td><td className="px-3 py-2.5">{STAGE_LABELS[d.stage]}</td>
              <td className="tnum px-3 py-2.5">{formatEur(d.value_eur)}</td><td className="px-3 py-2.5"><span className={`tnum rounded-full px-2 py-0.5 text-xs font-semibold ${scoreClass(d.opportunity_score)}`}>{Math.round(d.opportunity_score)}</span></td>
            </tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}
