import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Building2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/PublicHeader";
import { useWorkspace } from "@/lib/workspace";
import { FAQ_PRICING, NEUTRALITY, OFFERS, PRICING_STORY, type Offer, type OfferTier } from "@/content/venaqua";
import dealData from "@/data/dealflow-deals.json";

const DEAL_COUNT = (dealData as { deals: unknown[] }).deals.length;
const priceNumber = (p: string) => Number(p.replace(/[^\d]/g, "").slice(0, 6)) || undefined;

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Venaqua · Pricing — Deal Flow and Data" },
      { name: "description", content: "Free reuse map. Deal Flow from €2,900/yr (launch price) and Data from €6,000/yr per country. Flat prices, no success fees." },
      { property: "og:title", content: "Venaqua · Pricing" },
      { property: "og:description", content: "Work the wastewater-reuse deals with Deal Flow, or take the data with Data. All prices under €15,000." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Product",
        name: "Venaqua",
        offers: OFFERS.flatMap((o) => [
          ...o.tiers.map((t) => ({ "@type": "Offer", name: `${o.name} ${t.name}`, price: priceNumber(t.price), priceCurrency: "EUR" })),
          ...(o.addon ? [{ "@type": "Offer", name: o.addon.name, price: priceNumber(o.addon.price), priceCurrency: "EUR" }] : []),
        ]),
      }),
    }],
  }),
  component: Pricing,
});

const STATUS_STYLE: Record<OfferTier["status"], string> = {
  live: "bg-primary/10 text-primary",
  beta: "bg-secondary text-secondary-foreground",
  "on-request": "bg-muted text-foreground",
  coming: "bg-muted text-muted-foreground",
};

function Tier({ tier, primary }: { tier: OfferTier; primary: boolean }) {
  const { setContact } = useWorkspace();
  return (
    <div className="flex flex-col rounded-md border bg-background p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{tier.name}</h3>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[tier.status]}`}>{tier.statusLabel}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-2">
        <p className="text-xl font-semibold tabular-nums">{tier.price}</p>
        {tier.listPrice && <p className="text-sm tabular-nums text-muted-foreground line-through">{tier.listPrice}</p>}
        {tier.chip && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">{tier.chip}</span>}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{tier.detail}</p>
      <ul className="mt-3 flex flex-col gap-2">
        {tier.includes.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>{f}</span></li>
        ))}
      </ul>
      <Button className="mt-4 w-full" variant={primary ? "default" : "outline"} onClick={() => setContact(tier.id)}>{tier.cta}</Button>
    </div>
  );
}

function OfferCard({ offer }: { offer: Offer }) {
  const { setContact } = useWorkspace();
  return (
    <article aria-label={offer.name} className="flex min-w-0 flex-col rounded-lg border bg-card p-6">
      <h2 className="text-2xl font-semibold">{offer.name}</h2>
      <p className="mt-2 font-medium leading-snug">{offer.line}</p>
      <p className="mt-2 text-sm text-muted-foreground"><span className="font-medium text-foreground">For: </span>{offer.for}</p>
      <div className="mt-5 grid flex-1 gap-4 sm:grid-cols-2">
        {offer.tiers.map((t, i) => <Tier key={t.id} tier={t} primary={i === 0} />)}
      </div>
      {offer.addon && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed p-3 text-sm">
          <p><span className="font-medium">Add-on: {offer.addon.name} — {offer.addon.price}.</span> <span className="text-muted-foreground">{offer.addon.text}</span></p>
          <Button size="sm" variant="ghost" onClick={() => setContact(offer.addon!.id)}>{offer.addon.cta}<ArrowRight /></Button>
        </div>
      )}
      {offer.note && <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{offer.note}</p>}
    </article>
  );
}

function Pricing() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <main className="flex-1">
        <section className="mx-auto w-full max-w-5xl px-5 pb-8 pt-16 text-center sm:pt-20">
          <h1 className="text-3xl font-semibold sm:text-4xl">{PRICING_STORY.title}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">{PRICING_STORY.description}</p>
          <p className="mx-auto mt-2 max-w-2xl text-xs text-muted-foreground">{PRICING_STORY.small}</p>
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 px-5 py-3">
            <p className="text-sm">{PRICING_STORY.free}</p>
            <Button asChild size="sm" variant="outline"><Link to="/explore">Explore the free map<ArrowRight /></Link></Button>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 pb-12">
          <div className="grid gap-5 lg:grid-cols-2">
            {OFFERS.map((o) => <OfferCard key={o.id} offer={o} />)}
          </div>
          <p className="mt-5 text-center text-sm text-muted-foreground">Currently tracking <span className="font-medium text-foreground tabular-nums">{DEAL_COUNT}</span> reuse deals in Spain — updated weekly. <Link to="/deal-flow" className="font-medium text-primary hover:underline">See the live pipeline</Link></p>
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
