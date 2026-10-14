import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Building2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/PublicHeader";
import { useWorkspace } from "@/lib/workspace";
import { FAQ_PRICING, NEUTRALITY, PLANS, PRICING_STORY, type Plan } from "@/content/venaqua";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Venaqua · Pricing" },
      { name: "description", content: "Venaqua pricing: Deal Flow subscriptions, per-project Deal Files, and Data & API access for water-reuse teams." },
      { property: "og:title", content: "Venaqua · Pricing" },
      { property: "og:description", content: "Professional annual platform pricing for industrial water-reuse opportunity screening and project development." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Pricing,
});

function PlanCard({ plan }: { plan: Plan }) {
  const { setContact } = useWorkspace();
  return (
    <article aria-label={plan.name} className={`flex min-w-0 flex-col rounded-lg border bg-card p-6 ${plan.popular ? "border-primary/60 shadow-sm" : ""}`}>
      <p className="mb-3 text-xs font-medium text-muted-foreground lg:hidden">{plan.family}</p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{plan.name}</h2>
        {plan.popular && (
          <span className="whitespace-nowrap rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">Most popular</span>
        )}
      </div>
      <p className="mt-3 font-medium leading-snug">{plan.outcome}</p>
      <p className="mt-4 text-xl font-semibold tabular-nums">{plan.price}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{plan.for}</p>
      <ul className="mt-5 flex flex-col gap-3 border-t pt-5">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      {plan.tiers && <dl className="mt-5 space-y-4 border-t pt-4">
        {plan.tiers.map((tier) => <div key={tier.name}>
          <dt className="text-sm font-semibold">{tier.name}</dt>
          <dd className="mt-1 text-sm tabular-nums">{tier.price}</dd>
          <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">{tier.text}</dd>
        </div>)}
      </dl>}
      <p className="mb-6 mt-5 text-xs leading-relaxed text-muted-foreground">{plan.note}</p>
      <div className="mt-auto">
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
    </article>
  );
}

function Pricing() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <main className="flex-1">
        <section className="mx-auto w-full max-w-5xl px-5 pb-10 pt-16 text-center sm:pt-20">
          <p className="text-xs font-medium uppercase text-primary">Pricing</p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
            {PRICING_STORY.title}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {PRICING_STORY.description}
          </p>
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 pb-16">
          <div className="mb-4 hidden grid-cols-3 gap-5 lg:grid">
            <p className="col-span-2 border-b pb-3 text-sm font-semibold">Reuse projects <span className="ml-2 font-normal text-muted-foreground">One case or an ongoing portfolio</span></p>
            <p className="border-b pb-3 text-sm font-semibold">Data access <span className="ml-2 font-normal text-muted-foreground">Your own tools</span></p>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {PLANS.map((p) => <PlanCard key={p.name} plan={p} />)}
          </div>
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{PRICING_STORY.pipelineNote}</p>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Just looking? The <Link to="/explore" className="font-medium text-primary underline">free map</Link> is always open — browse plants, companies and water stress without an account.
          </p>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Venaqua is decision-support software, not engineering design, legal advice or a brokerage service. Questions: <a href="mailto:support@venaqua.com" className="underline">support@venaqua.com</a>
          </p>
        </section>

        <AddonsAndFaq />
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

function AddonsAndFaq() {
  return (
    <>
      <section className="mx-auto w-full max-w-6xl px-5 pb-12">
        <h2 className="text-xl font-semibold tracking-tight">Neutral by design</h2>
        <div className="mt-4 grid gap-5 md:grid-cols-3">
          {NEUTRALITY.map((n) => (
            <div key={n.title} className="rounded-xl border bg-card p-5">
              <h3 className="font-semibold">{n.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{n.text}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="mx-auto w-full max-w-3xl px-5 pb-16">
        <h2 className="text-xl font-semibold tracking-tight">Questions</h2>
        <div className="mt-4 divide-y rounded-xl border bg-card">
          {FAQ_PRICING.map((f) => (
            <details key={f.q} className="group p-5">
              <summary className="cursor-pointer font-medium">{f.q}</summary>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
