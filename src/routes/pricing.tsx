import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Building2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/PublicHeader";
import { useWorkspace } from "@/lib/workspace";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Venaqua · Pricing" },
      { name: "description", content: "Start free on the Venaqua map. Add the workspace when your team is ready — Market Access, Development Portfolio, Asset Intelligence and Enterprise plans." },
      { property: "og:title", content: "Venaqua · Pricing" },
      { property: "og:description", content: "Professional annual platform pricing for industrial water-reuse opportunity screening and project development." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Pricing,
});

type Plan = {
  name: string;
  price: string;
  for: string;
  features: string[];
  cta: string;
  href?: "/explore";
  topic?: string;
  popular?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Free Explorer",
    price: "Free",
    for: "Anyone exploring water-reuse opportunities",
    features: [
      "Public map",
      "Basic filters",
      "Compact public opportunity previews",
      "Water-stress and source visibility",
    ],
    cta: "Explore the map",
    href: "/explore",
  },
  {
    name: "Market Access",
    price: "From €12,000/year",
    for: "Advisors and developers screening opportunities in one market",
    features: [
      "Advanced Reuse Searches",
      "Saved searches",
      "Full Opportunity Cards",
      "Up to 10 active opportunities",
      "Standard analysis briefs",
      "Basic team workspace",
    ],
    cta: "Book a demo",
    topic: "Booking a demo — Market Access",
  },
  {
    name: "Development Portfolio",
    price: "€30,000–45,000/year",
    popular: true,
    for: "Engineering teams, operators and industrial associations managing a development pipeline",
    features: [
      "Everything in Market Access",
      "Existing Projects workspace expanded into Reuse Pipeline",
      "Up to 25 active opportunities",
      "Project stages, owners, tasks and evidence logs",
      "Tender, permit, drought and data-change alerts",
      "Comparable-project intelligence",
      "Professional decision briefs",
    ],
    cta: "Talk to the team",
    topic: "Talk to the team — Development Portfolio",
  },
  {
    name: "Asset Intelligence",
    price: "€60,000–100,000/year",
    for: "Operators and planning teams managing private asset and demand data",
    features: [
      "Everything in Development Portfolio",
      "Portfolio dashboard",
      "Private data layers",
      "Custom scoring",
      "Controlled project rooms",
      "API/export options",
    ],
    cta: "Design your workspace",
    topic: "Design your workspace — Asset Intelligence",
  },
  {
    name: "Enterprise",
    price: "Custom",
    for: "Multi-region operators, agencies and infrastructure teams",
    features: [
      "Multi-region access",
      "Integrations",
      "SSO",
      "Security/governance",
      "Custom data products",
    ],
    cta: "Contact Venaqua",
    topic: "Enterprise enquiry",
  },
];

function PlanCard({ plan }: { plan: Plan }) {
  const { setContact } = useWorkspace();
  return (
    <div className={`flex flex-col rounded-xl border bg-card p-6 ${plan.popular ? "border-primary/60 shadow-sm" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">{plan.name}</h3>
        {plan.popular && (
          <span className="label-caps rounded-full bg-primary/10 px-2.5 py-1 text-primary">Most popular</span>
        )}
      </div>
      <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums">{plan.price}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{plan.for}</p>
      <ul className="mt-4 flex flex-1 flex-col gap-2">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        {plan.href ? (
          <Button asChild variant={plan.popular ? "default" : "outline"} className="w-full">
            <Link to={plan.href}>{plan.cta}<ArrowRight /></Link>
          </Button>
        ) : (
          <Button
            variant={plan.popular ? "default" : "outline"}
            className="w-full"
            onClick={() => setContact(plan.topic ?? plan.name)}
          >
            {plan.cta}
          </Button>
        )}
      </div>
    </div>
  );
}

function Pricing() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <main className="flex-1">
        <section className="mx-auto w-full max-w-5xl px-5 pb-10 pt-16 text-center sm:pt-20">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Pricing</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Start free on the map. Add the workspace when your team is ready.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Annual platform pricing for screening, qualifying and developing industrial water-reuse projects. No checkout online — every paid plan starts with a conversation.
          </p>
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 pb-16">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {PLANS.map((p) => <PlanCard key={p.name} plan={p} />)}
            <div className="flex flex-col justify-center gap-4 rounded-xl border border-dashed bg-muted/40 p-6 text-sm leading-relaxed text-muted-foreground">
              <p>Implementation and private-data setup are scoped separately.</p>
              <p>Venaqua is decision-support software, not engineering design, legal advice or a brokerage service.</p>
              <a href="mailto:support@venaqua.com" className="font-medium text-primary underline">support@venaqua.com</a>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-border/60 px-5 py-6 text-center text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> Venaqua</span>
          <span>Built on public European water data</span>
          <a href="mailto:support@venaqua.com" className="underline">support@venaqua.com</a>
          <Link to="/" className="underline">Home</Link>
        </div>
      </footer>
    </div>
  );
}
