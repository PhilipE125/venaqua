import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Building2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/PublicHeader";
import { useWorkspace } from "@/lib/workspace";
import { FAQ_PRICING, NEUTRALITY, PLANS, PRICING_STORY, type Plan } from "@/content/venaqua";
import dealData from "@/data/dealflow-deals.json";

const DEAL_COUNT = (dealData as { deals: unknown[] }).deals.length;
const priceNumber = (p: string) => Number(p.replace(/[^\d]/g, "").slice(0, 6)) || 0;

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Venaqua · Pricing: Deal Flow and Data" },
      { name: "description", content: "Free reuse map. Deal Flow Pro €2,900/yr launch price, Team €12,000/yr, engineer-reviewed cases from €4,900, Data from €6,000/yr. EUR excl. VAT, no success fees." },
      { property: "og:title", content: "Venaqua · Pricing" },
      { property: "og:description", content: "Investment cases, early signals and tenders for water reuse in Spain. All prices under €15,000." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org", "@type": "Product", name: "Venaqua",
        offers: PLANS.map((p) => ({ "@type": "Offer", name: p.name, price: priceNumber(p.price), priceCurrency: "EUR" })),
      }),
    }],
  }),
  component: Pricing,
});

const STATUS_STYLE: Record<Plan["status"], string> = {
  live: "bg-primary/10 text-primary",
  beta: "bg-secondary text-secondary-foreground",
  "on-request": "bg-muted text-foreground",
  coming: "bg-muted text-muted-foreground",
};

function PlanCta({ plan }: { plan: Plan }) {
  const { setContact } = useWorkspace();
  const id = plan.id;
  return <Button size="sm" className="w-full" variant={plan.cta === "Start pilot" ? "default" : "outline"} onClick={() => setContact(id)}>{plan.cta}</Button>;
}

function Pricing() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <main className="flex-1">
        <section className="mx-auto w-full max-w-5xl px-5 pb-8 pt-16 text-center sm:pt-20">
          <h1 className="text-3xl font-semibold sm:text-4xl">{PRICING_STORY.title}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">{PRICING_STORY.description}</p>
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 pb-12">
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full min-w-[560px] table-fixed text-sm">
              <thead>
                <tr className="border-b align-top">
                  {PLANS.map((p) => (
                    <th key={p.id} className="p-4 text-left font-normal">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="font-semibold">{p.name}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[p.status]}`}>{p.statusLabel}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-baseline gap-2">
                        <span className="tabular-nums text-lg font-semibold">{p.price}</span>
                        {p.listPrice && <span className="tabular-nums text-sm text-muted-foreground line-through">{p.listPrice}</span>}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{p.priceNote}</p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="align-top">
                  {PLANS.map((p) => (
                    <td key={p.id} className="p-4">
                      <ul className="flex flex-col gap-2">
                        {p.includes.map((f) => {
                          const coming = f.includes("(coming soon");
                          return (
                            <li key={f} className={`flex items-start gap-2 ${coming ? "text-muted-foreground/70" : ""}`}>
                              <Check className={`mt-0.5 h-4 w-4 shrink-0 ${coming ? "text-muted-foreground/50" : "text-primary"}`} />
                              <span>{f}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </td>
                  ))}
                </tr>
                <tr>{PLANS.map((p) => <td key={p.id} className="p-4 pt-0"><PlanCta plan={p} /></td>)}</tr>
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm">
            <span className="text-muted-foreground">{PRICING_STORY.free}</span>
            <Button asChild variant="outline" size="sm"><Link to="/explore">Open the free map</Link></Button>
          </div>
          <p className="mt-4 text-center text-sm font-medium">{PRICING_STORY.small}</p>
          <p className="mt-1 text-center text-xs text-muted-foreground">EUR, excluding VAT.</p>
          <p className="mt-5 text-center text-sm text-muted-foreground">Currently tracking <span className="font-medium text-foreground tabular-nums">{DEAL_COUNT}</span> reuse tenders and signals in Spain. <Link to="/deal-flow" className="font-medium text-primary hover:underline">See Deal Flow</Link></p>
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 pb-12">
          <h2 className="text-xl font-semibold tracking-tight">Which one is for me?</h2>
          <div className="mt-4 divide-y rounded-xl border bg-card">
            {PRICING_STORY.which.map((w) => (
              <div key={w.want} className="flex items-center justify-between gap-3 p-4 text-sm"><span>{w.want}</span><span className="flex items-center gap-1 font-medium text-primary"><ArrowRight className="h-4 w-4" />{w.offer}</span></div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 pb-12">
          <h2 className="text-xl font-semibold tracking-tight">Why it's priced this way</h2>
          <div className="mt-4 grid gap-5 md:grid-cols-3">
            {PRICING_STORY.why.map((t) => <p key={t} className="rounded-xl border bg-card p-5 text-sm leading-relaxed">{t}</p>)}
          </div>
        </section>

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

        <section className="mx-auto w-full max-w-3xl px-5 pb-12">
          <h2 className="text-xl font-semibold tracking-tight">Questions</h2>
          <div className="mt-4 divide-y rounded-xl border bg-card">
            {FAQ_PRICING.map((f) => (
              <details key={f.q} className="group p-5">
                <summary className="cursor-pointer font-medium">{f.q}</summary>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
            Price comparisons: Spanish tender-alert services (e.g. Tendios Advanced, Gobierto Pro) and typical feasibility-study costs, as published by providers. Venaqua is decision-support software, not engineering design, legal advice or a brokerage service. Questions: <a href="mailto:support@venaqua.com" className="underline">support@venaqua.com</a>
          </p>
        </section>
      </main>
      <footer className="border-t border-border/60 px-5 py-6 text-center text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />Venaqua</span>
          <Link to="/" className="hover:text-foreground">Home</Link>
          <Link to="/explore" className="hover:text-foreground">Free map</Link>
          <a href="mailto:support@venaqua.com" className="hover:text-foreground">support@venaqua.com</a>
        </div>
      </footer>
    </div>
  );
}
