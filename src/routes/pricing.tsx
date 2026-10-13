import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { PublicFooter, PublicHeader } from "@/components/PublicHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/lib/workspace";

export const Route = createFileRoute("/pricing")({
  head: () => ({ meta: [
    { title: "Pricing · Venaqua" },
    { name: "description", content: "Annual Venaqua plans from the free public map to market, portfolio and asset intelligence workspaces." },
    { property: "og:title", content: "Pricing · Venaqua" },
    { property: "og:description", content: "Start free with the Venaqua map and scale to a team water-reuse pipeline." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Pricing,
});

type Plan = { name: string; price: string; for: string; items: string[]; cta: string; popular?: boolean };
const PLANS: Plan[] = [
  { name: "Free Explorer", price: "Free", for: "Anyone exploring water-reuse opportunities", items: ["Public map", "Basic filters", "Compact public opportunity previews", "Water-stress and source visibility"], cta: "Explore the map" },
  { name: "Market Access", price: "From €12,000/year", for: "Advisors and developers screening opportunities in one market", items: ["Advanced Reuse Searches", "Saved searches", "Full Opportunity Cards", "Up to 10 active opportunities", "Standard analysis briefs", "Basic team workspace"], cta: "Book a demo" },
  { name: "Development Portfolio", price: "€30,000–45,000/year", popular: true, for: "Engineering teams, operators and industrial associations managing a development pipeline", items: ["Everything in Market Access", "Existing Projects workspace expanded into Reuse Pipeline", "Up to 25 active opportunities", "Project stages, owners, tasks and evidence logs", "Tender, permit, drought and data-change alerts", "Comparable-project intelligence", "Professional decision briefs"], cta: "Talk to the team" },
  { name: "Asset Intelligence", price: "€60,000–100,000/year", for: "Operators and planning teams managing private asset and demand data", items: ["Everything in Development Portfolio", "Portfolio dashboard", "Private data layers", "Custom scoring", "Controlled project rooms", "API/export options"], cta: "Design your workspace" },
  { name: "Enterprise", price: "Custom", for: "Multi-region operators, agencies and infrastructure teams", items: ["Multi-region access", "Integrations", "SSO", "Security/governance", "Custom data products"], cta: "Contact Venaqua" },
];

function Pricing() {
  const { setContact } = useWorkspace();
  return <div className="min-h-dvh bg-background">
    <PublicHeader />
    <main className="mx-auto max-w-6xl px-5 py-16">
      <p className="label-caps">Pricing</p>
      <h1 className="mt-3 text-4xl font-semibold">Annual platform plans</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">Start free with the public map. Move to a team workspace when you are ready to build a reuse pipeline.</p>
      <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {PLANS.map(p => <article key={p.name} className={`flex flex-col rounded-lg border bg-card p-6 ${p.popular ? "border-primary shadow-map-panel" : ""}`}>
          <div className="flex items-center justify-between gap-2"><h2 className="text-lg font-semibold">{p.name}</h2>{p.popular && <Badge>Most popular</Badge>}</div>
          <p className="tnum mt-3 text-2xl font-semibold">{p.price}</p>
          <p className="mt-2 text-sm text-muted-foreground">{p.for}</p>
          <ul className="mt-6 flex-1 space-y-2">{p.items.map(i => <li key={i} className="flex gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{i}</li>)}</ul>
          {p.price === "Free" ? <Button asChild className="mt-6" variant="outline"><Link to="/explore">{p.cta}</Link></Button> : <Button className="mt-6" variant={p.popular ? "default" : "outline"} onClick={() => setContact(`${p.name} plan`)}>{p.cta}</Button>}
        </article>)}
      </div>
      <div className="mt-12 space-y-2 text-sm text-muted-foreground">
        <p>Implementation and private-data setup are scoped separately.</p>
        <p>Venaqua is decision-support software, not engineering design, legal advice or a brokerage service.</p>
      </div>
    </main>
    <PublicFooter />
  </div>;
}
