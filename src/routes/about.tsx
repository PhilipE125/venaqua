import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Building2, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/PublicHeader";
import { AUDIENCES, NEUTRALITY, VISION } from "@/content/venaqua";
import { FactValue, SourceCaption, SourcesList, SourcesProvider } from "@/components/marketing";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Venaqua · Our mission" },
      { name: "description", content: VISION.mission },
      { property: "og:title", content: "About Venaqua · Our mission" },
      { property: "og:description", content: VISION.description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: About,
});

function About() {
  return (
    <SourcesProvider ids={["reuseShare"]}>
      <div className="flex min-h-screen flex-col bg-background">
        <PublicHeader />
        <main className="flex-1">
          <section className="mx-auto w-full max-w-3xl px-5 pb-12 pt-16 sm:pt-20">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">About us · Our mission</p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{VISION.mission}</h1>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">{VISION.description}</p>
            <div className="mt-8 rounded-xl border bg-card p-6">
              <FactValue id="reuseShare" className="text-3xl font-semibold tabular-nums" />
              <p className="mt-1 text-sm text-muted-foreground">of treated wastewater is reused in Spain. Venaqua finds the reuse projects worth building — and makes them bankable.</p>
              <SourceCaption id="reuseShare" />
            </div>
          </section>

          <section className="border-t border-border/60">
            <div className="mx-auto w-full max-w-3xl px-5 py-12">
              <div className="flex items-center gap-2"><Gauge className="h-5 w-5 text-primary" /><h2 className="text-xl font-semibold tracking-tight">How we measure impact</h2></div>
              <p className="mt-3 text-base leading-relaxed">{VISION.impact}</p>
              <p className="mt-2 text-sm text-muted-foreground">We report this number only once it is verified — we do not show estimated or running counters.</p>
            </div>
          </section>

          <section className="border-t border-border/60">
            <div className="mx-auto w-full max-w-5xl px-5 py-12">
              <h2 className="text-xl font-semibold tracking-tight">Who we build for</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {AUDIENCES.map((a) => (
                  <div key={a.title} className="rounded-xl border bg-card p-5">
                    <h3 className="font-semibold leading-snug">{a.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{a.text}</p>
                    <p className="mt-2 label-caps text-muted-foreground">{a.access}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="border-t border-border/60">
            <div className="mx-auto w-full max-w-5xl px-5 py-12">
              <h2 className="text-xl font-semibold tracking-tight">Neutral by design</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {NEUTRALITY.map((n) => (
                  <div key={n.title} className="rounded-xl border bg-card p-5">
                    <h3 className="font-semibold">{n.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{n.text}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex justify-center">
                <Button asChild size="lg"><Link to="/explore">Explore the free map<ArrowRight /></Link></Button>
              </div>
            </div>
          </section>
          <SourcesList />
        </main>
        <footer className="border-t border-border/60 px-5 py-6 text-center text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> Venaqua</span>
            <a href="mailto:support@venaqua.com" className="underline">support@venaqua.com</a>
            <Link to="/" className="underline">Home</Link>
          </div>
        </footer>
      </div>
    </SourcesProvider>
  );
}
