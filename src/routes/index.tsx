import { createFileRoute, Link } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { ArrowRight, Droplets, Factory, Map, TrendingUp } from "lucide-react";
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

const FEATURES = [
  {
    icon: Map,
    title: "Find reuse-ready water near you",
    text: "Live public data on treatment plants, reuse volumes and industrial demand across Spain, with Catalonia in full detail.",
  },
  {
    icon: TrendingUp,
    title: "Compare the economics",
    text: "See reclaimed water versus your tariff, with transparent assumptions and drought-stress scenarios through 2050.",
  },
  {
    icon: Factory,
    title: "Develop the project",
    text: "Save opportunities, track them through a pipeline and request an indicative feasibility brief from the team.",
  },
];

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

function Landing() {
  const { setAuthOpen } = useWorkspace();
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <MapBackdrop />
      <header className="relative z-10 flex items-center justify-between border-b border-border/60 bg-background/70 px-5 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Droplets className="h-5 w-5 text-primary" />
          <span className="font-semibold tracking-tight">Venaqua</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setAuthOpen(true)}>Sign in</Button>
          <Button size="sm" onClick={() => setAuthOpen(true)}>Get started — full version</Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="mx-auto flex w-full max-w-4xl flex-col items-center px-5 pb-16 pt-20 text-center sm:pt-28">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Industrial water reuse · Spain</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Match reclaimed water supply with the companies that need it
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Venaqua screens treatment plants and industrial water demand on live public data, so you can find, evaluate and develop reuse projects with confidence.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/explore">Explore the free map<ArrowRight /></Link>
            </Button>
            <Button variant="outline" size="lg" onClick={() => setAuthOpen(true)}>Get started — full version</Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">No account needed for the map. Free to explore.</p>
        </section>

        <section className="border-t bg-muted/40">
          <div className="mx-auto grid w-full max-w-5xl gap-6 px-5 py-14 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border bg-card p-6">
                <f.icon className="h-5 w-5 text-primary" />
                <h2 className="mt-3 font-semibold">{f.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t px-5 py-6 text-center text-xs text-muted-foreground">
        Venaqua · Built on public European water data · support@venaqua.com
      </footer>
    </div>
  );
}
