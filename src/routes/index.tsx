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
import { useWorkspace } from "@/lib/workspace";

const MapView = lazy(() => import("@/components/map/MapView"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Venaqua · Industrial water reuse opportunities" },
      { name: "description", content: "Find water reuse opportunities across Spain, evaluate project economics and develop a feasibility case with the Venaqua team." },
      { property: "og:title", content: "Venaqua · Industrial water reuse opportunities" },
      { property: "og:description", content: "Explore supply and buyers, compare water options and turn promising opportunities into validated projects." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function MapBackdrop() {
  return (
    <div className="landing-map pointer-events-none absolute inset-0" aria-hidden="true">
      <ClientOnly fallback={<div className="h-full w-full bg-muted" />}>
        <Suspense fallback={<div className="h-full w-full animate-pulse bg-muted" />}>
          <MapView />
        </Suspense>
      </ClientOnly>
      <div className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/55 to-background/90" />
    </div>
  );
}

const WHY = [
  {
    title: "Supply and demand are fragmented",
    text: "Treatment plants, reuse permits and industrial water users live in separate registries, so the matches that exist are hard to see.",
  },
  {
    title: "Teams lack a shared evidence base",
    text: "Without one place to compare flows, distances, tariffs and constraints, early conversations restart from zero every time.",
  },
  {
    title: "Weak opportunities absorb engineering time",
    text: "Projects that stall before engineering begins still consume expensive feasibility work that better-located projects deserved.",
  },
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

const TEAMS = [
  { icon: Droplets, title: "Water operators", text: "Show the reuse potential of your assets and the buyers it could serve." },
  { icon: Wrench, title: "Engineering advisors", text: "Screen and qualify opportunities faster before committing engineering hours." },
  { icon: Factory, title: "Industrial clusters", text: "Find reclaimable water near your members' sites and compare it to their tariffs." },
  { icon: Landmark, title: "Public planning teams", text: "See where reuse demand, drought stress and treatment capacity overlap." },
];

const PROOF = [
  "Searchable Spain/Catalonia map",
  "Treatment and water recycling plants",
  "Company and demand signals",
  "Water-stress layer",
  "Opportunity analysis",
  "Project workspace",
  "Transparent evidence labels",
];

function Landing() {
  const { setAuthOpen, setContact } = useWorkspace();
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <MapBackdrop />
      <header className="relative z-10 flex items-center justify-between border-b border-border/60 bg-background/70 px-5 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-primary" />
            <span className="font-semibold tracking-tight">Venaqua</span>
          </Link>
          <nav className="hidden items-center gap-5 text-sm text-muted-foreground md:flex">
            <a className="transition-colors hover:text-foreground" href="/#how">How it works</a>
            <a className="transition-colors hover:text-foreground" href="/#teams">For teams</a>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setAuthOpen(true)}>Sign in</Button>
          <Button size="sm" onClick={() => setAuthOpen(true)}>Get started — full version</Button>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col">
        <section className="mx-auto flex w-full max-w-4xl flex-col items-center px-5 pb-16 pt-20 text-center sm:pt-28">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Industrial water reuse · Spain</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Find the water-reuse projects worth building
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Venaqua brings water recycling capacity, industrial demand, water stress and project constraints into one workspace — so teams can identify and qualify reuse infrastructure opportunities faster.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/explore">Explore the free map<ArrowRight /></Link>
            </Button>
            <Button variant="outline" size="lg" onClick={() => setAuthOpen(true)}>Get started</Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">No account needed for the map. Free to explore.</p>
        </section>

        <section id="why" className="border-t border-border/60 bg-background/80 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-5xl px-5 py-16">
            <p className="label-caps text-primary">Why Venaqua</p>
            <h2 className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
              Water reuse projects often stall before engineering begins.
            </h2>
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
              {TEAMS.map((t) => (
                <div key={t.title} className="rounded-xl border bg-card p-6">
                  <t.icon className="h-5 w-5 text-primary" />
                  <h3 className="mt-3 font-semibold">{t.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border/60 bg-background/80 backdrop-blur-sm">
          <div className="mx-auto grid w-full max-w-5xl gap-8 px-5 py-16 md:grid-cols-[1fr_1.2fr]">
            <div>
              <p className="label-caps text-primary">What you can do today</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Everything below is live in the product</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                No concepts or mockups — this is the current Venaqua workspace, built on public European water data.
              </p>
            </div>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {PROOF.map((p) => (
                <li key={p} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
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
              <Users className="h-3.5 w-3.5" /> Water operators, engineering advisors, industrial clusters and public planning teams.
            </p>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border/60 bg-background/70 px-5 py-6 text-center text-xs text-muted-foreground backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> Venaqua</span>
          <span>Built on public European water data</span>
          <a href="mailto:support@venaqua.com" className="underline">support@venaqua.com</a>
          <Link to="/pricing" className="underline">Pricing</Link>
        </div>
      </footer>
    </div>
  );
}
