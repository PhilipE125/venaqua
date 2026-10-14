// ============= Full file contents =============
import { createFileRoute, Link } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import {
  ArrowRight,
  Building2,
  Check,
  Droplets,
  Factory,
  Landmark,
  Map,
  MessageCircle,
  Search,
  ShieldCheck,
  TrendingUp,
  Users,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/PublicHeader";
import { useWorkspace } from "@/lib/workspace";
import { AUDIENCES, FACTS, MODULES, NEUTRALITY, VISION, type AudienceIcon, type FactId } from "@/content/venaqua";
import { FactValue, SourceCaption, SourcesList, SourcesProvider, StatusBadge } from "@/components/marketing";

const HOME_FACTS: FactId[] = ["reuseShare", "industryShare", "tertiary", "uwwtd2039", "reclaimedCost", "bcnTariff", "energyAvoided"];

const MapView = lazy(() => import("@/components/map/MapView"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Venaqua · Optimize wastewater reuse" },
      { name: "description", content: VISION.mission },
      { property: "og:title", content: "Venaqua · Optimize wastewater reuse" },
      { property: "og:description", content: VISION.description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function MapBackdrop() {
  return (
    <div className="landing-map pointer-events-none absolute inset-x-0 top-0 h-[680px] sm:h-[760px]" aria-hidden="true">
      <ClientOnly fallback={<div className="h-full w-full bg-muted" />}>
        <Suspense fallback={<div className="h-full w-full animate-pulse bg-muted" />}>
          <MapView presentation="landing" />
        </Suspense>
      </ClientOnly>
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/30 to-background/90" />
    </div>
  );
}

const WHY = [
  {
    title: "Permits take up to 12 months",
    text: "A reuse authorisation can take a year, and silence counts as refusal. Venaqua lays out the permit route and the evidence each step needs, so applications start complete and early.",
  },
  {
    title: "Pipes are the biggest cost",
    text: "At €0.35–0.85M per km, distance decides viability. Venaqua ranks matches by connection length and shows indicative cost ranges before anyone pays for a feasibility study.",
  },
  {
    title: "Someone has to pay",
    text: "Tarragona's ~€42M scheme was 85% EU-funded. Each Investment Case lists funding options and who benefits, so the parties can agree a split instead of waiting for one payer.",
  },
];

const WHY_NOW = [
  { value: "2039", text: "EU deadline for extra treatment at large plants (Directive 2024/3019). The upgrade makes reuse-quality water cheaper to produce." },
  { value: "RD 1085/2024", text: "Spain's 2024 reuse decree sets the authorisation rules every project now has to follow." },
  { value: "€0.10–0.19 vs €1.73–2.59", text: "Cost per m³ of reclaimed water against industrial mains water in the Barcelona area — the saving exists in wet years too." },
];

const STEPS = [
  {
    icon: Map,
    step: "1 · Explore",
    title: "Explore",
    text: "Find plants, water recycling capacity, industrial users and water-stress signals.",
  },
  {
    icon: Search,
    step: "2 · Qualify",
    title: "Qualify",
    text: "Compare indicative economics, constraints, confidence and next actions.",
  },
  {
    icon: TrendingUp,
    step: "3 · Progress",
    title: "Progress",
    text: "Save viable opportunities into a structured team project pipeline.",
  },
];

const AUDIENCE_ICONS: Record<AudienceIcon, typeof Droplets> = { operators: Wrench, owners: Droplets, industry: Factory, investors: Landmark };


function Landing() {
  const { setAuthOpen, setContact } = useWorkspace();
  return (
    <SourcesProvider ids={HOME_FACTS}>
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <MapBackdrop />
      <PublicHeader />

      <main className="relative z-10 flex flex-1 flex-col">
        <section className="mx-auto flex w-full max-w-4xl flex-col items-center px-5 pb-16 pt-20 text-center sm:pt-28">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Venaqua · Industrial water reuse</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
            {VISION.headline}
            <span className="mt-2 block text-2xl font-normal text-muted-foreground sm:text-3xl">{VISION.subheadline}</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {VISION.description}
          </p>
          <p className="mt-4 max-w-2xl text-sm font-medium leading-relaxed">{VISION.pitch}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/explore">Explore the free map<ArrowRight /></Link>
            </Button>
            <Button variant="outline" size="lg" onClick={() => setAuthOpen(true)}>Get started</Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">No account needed for the map. Free to explore.</p>
          <div className="mt-10 grid w-full gap-3 text-left sm:grid-cols-3">
            {VISION.questions.map((q) => (
              <a key={q.pillar} href="/platform#three-questions" className="rounded-xl border bg-card/90 p-4 transition-colors hover:border-primary/60">
                <div className="flex items-center justify-between gap-2">
                  <span className="label-caps text-primary">{q.label}</span>
                  <StatusBadge status={q.status} />
                </div>
                <p className="mt-2 text-sm leading-snug">{q.question}</p>
              </a>
            ))}
          </div>
        </section>

        <section id="why" className="border-t border-border/60 bg-background/80 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-5xl px-5 py-16">
            <p className="label-caps text-primary">Why Venaqua</p>
            <h2 className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
              Reuse projects stall on permits, pipe costs and who pays.
            </h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {HOME_FACTS.map((id) => <HomeFact key={id} id={id} />)}
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">Finding a match is only the first filter. Venaqua is built to get the shortlisted ones through the hard parts.</p>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {WHY.map((w) => (
                <div key={w.title} className="rounded-xl border bg-card p-6">
                  <h3 className="font-semibold leading-snug">{w.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{w.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="why-now" className="border-t border-border/60 bg-background/80 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-5xl px-5 py-16">
            <p className="label-caps text-primary">Why now — not only in droughts</p>
            <h2 className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">Regulation and price push reuse forward, wet year or dry.</h2>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {WHY_NOW.map((w) => (
                <div key={w.value} className="rounded-xl border bg-card p-6">
                  <p className="text-xl font-semibold tabular-nums">{w.value}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{w.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="border-t border-border/60 bg-background/80 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-5xl px-5 py-16">
            <p className="label-caps text-primary">How it works</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">From map to pipeline</h2>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.title} className="rounded-xl border bg-card p-6">
                  <div className="flex items-center gap-2">
                    <s.icon className="h-5 w-5 text-primary" />
                    <span className="label-caps text-muted-foreground">{s.step}</span>
                  </div>
                  <h3 className="mt-3 font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="teams" className="border-t border-border/60 bg-background/80 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-5xl px-5 py-16">
            <p className="label-caps text-primary">For teams</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Built for the teams that develop reuse</h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {AUDIENCES.map((t) => {
                const Icon = AUDIENCE_ICONS[t.icon];
                return (
                  <div key={t.title} className="flex flex-col rounded-xl border bg-card p-6">
                    <Icon className="h-5 w-5 text-primary" />
                    <h3 className="mt-3 font-semibold leading-snug">{t.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{t.text}</p>
                    <p className="mt-3 label-caps text-muted-foreground">{t.access}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-t border-border/60 bg-background/80 backdrop-blur-sm">
          <div className="mx-auto grid w-full max-w-5xl gap-8 px-5 py-16 md:grid-cols-[1fr_1.2fr]">
            <div>
              <p className="label-caps text-primary">What you can do today</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">What is in the product, and what is not yet</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Every module carries its real status, so you know exactly what works today. Built on public European water data.
              </p>
            </div>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {MODULES.map((m) => (
                <li key={m.name} className="flex items-start justify-between gap-2 text-sm">
                  <span className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{m.name}</span>
                  </span>
                  <StatusBadge status={m.status} />
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-border/60 bg-background/80 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-5xl px-5 py-16">
            <p className="label-caps text-primary">Neutral by design</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Three rules we never break</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">Why no success fees? Plant owners, industrial sites, funders and contractors all have to trust the same numbers for a project to move. If we earned more when a deal closed, none of them could. Flat prices keep our analysis usable by every side.</p>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {NEUTRALITY.map((n) => (
                <div key={n.title} className="rounded-xl border bg-card p-6">
                  <h3 className="font-semibold">{n.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{n.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border/60 bg-background/80 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-5xl px-5 py-12">
            <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/80 p-6">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p className="text-sm leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">A note on evidence.</span>{" "}
                Venaqua distinguishes measured data, modelled estimates and assumptions. It supports early-stage decisions; it does not replace engineering, legal or permitting review.
              </p>
            </div>
          </div>
        </section>

        <section className="border-t border-border/60">
          <div className="mx-auto flex w-full max-w-4xl flex-col items-center px-5 py-20 text-center">
            <h2 className="max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
              Start with the map. Build your reuse pipeline when you are ready.
            </h2>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/explore">Explore the free map<ArrowRight /></Link>
              </Button>
              <Button variant="outline" size="lg" onClick={() => setContact("")}>
                <MessageCircle />Talk to the team
              </Button>
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> Water operators, plant owners, industrial sites and investors.
            </p>
          </div>
        </section>
        <div className="relative"><SourcesList /></div>
      </main>

      <footer className="relative z-10 border-t border-border/60 bg-background/70 px-5 py-6 text-center text-xs text-muted-foreground backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> Venaqua</span>
          <span>Built on public European water data</span>
          <a href="mailto:support@venaqua.com" className="underline">support@venaqua.com</a>
        </div>
      </footer>
    </div>
    </SourcesProvider>
  );
}

function HomeFact({ id }: { id: FactId }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <FactValue id={id} className="text-2xl font-semibold tabular-nums tracking-tight" />
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{FACTS[id].label}</p>
      <SourceCaption id={id} />
    </div>
  );
}
