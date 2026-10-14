import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/PublicHeader";
import { FACTS, FAQ_PLATFORM, MODULES, NEUTRALITY, VISION, type FactId } from "@/content/venaqua";
import { FactValue, SourceCaption, SourcesList, SourcesProvider, StatusBadge } from "@/components/marketing";

export const Route = createFileRoute("/platform")({
  head: () => ({
    meta: [
      { title: "Venaqua · Platform" },
      { name: "description", content: "Source, risk and proof for industrial water: what is live in Venaqua today, what is in beta and what is coming." },
      { property: "og:title", content: "Venaqua · Platform" },
      { property: "og:description", content: "Explore Venaqua’s industrial-water tools, with clear availability labels and sources for every figure." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Platform,
});

const PLATFORM_FACTS: FactId[] = [
  "reuseShare", "industryShare", "tertiary", "madridRelease", "reclaimedCost", "desalCost", "bcnTariff",
  "pipelineCost", "tarragona", "uwwtd2039", "authorisation", "energyAvoided",
];

function Platform() {
  return (
    <SourcesProvider ids={PLATFORM_FACTS}>
      <div className="flex min-h-screen flex-col bg-background">
        <PublicHeader />
        <main className="flex-1">
          <section className="mx-auto w-full max-w-4xl px-5 pb-10 pt-16 text-center sm:pt-20">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Platform</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{VISION.tagline}</h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">{VISION.mission}</p>
          </section>

          <section id="three-questions" className="mx-auto w-full max-w-5xl scroll-mt-20 px-5 pb-14">
            <h2 className="text-xl font-semibold tracking-tight">Three questions, three pillars</h2>
            <div className="mt-4 grid gap-5 md:grid-cols-3">
              {VISION.questions.map((q) => (
                <div key={q.pillar} className="flex flex-col rounded-xl border bg-card p-6">
                  <div className="flex items-center justify-between gap-2">
                    <span className="label-caps text-primary">{q.label}</span>
                    <StatusBadge status={q.status} />
                  </div>
                  <p className="mt-3 font-semibold leading-snug">{q.question}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{q.note}</p>
                  <ul className="mt-4 flex flex-col gap-2 border-t pt-4">
                    {MODULES.filter((m) => m.pillar === q.pillar).map((m) => (
                      <li key={m.name} className="flex items-start justify-between gap-2 text-sm">
                        <span>
                          <span className="font-medium">{m.name}</span>
                          <span className="block text-xs text-muted-foreground">{m.text}</span>
                        </span>
                        <StatusBadge status={m.status} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section className="border-t border-border/60">
            <div className="mx-auto w-full max-w-5xl px-5 py-14">
              <h2 className="text-xl font-semibold tracking-tight">The market in numbers</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {PLATFORM_FACTS.map((id) => (
                  <div key={id} className="rounded-xl border bg-card p-5">
                    <FactValue id={id} className="text-xl font-semibold tabular-nums tracking-tight" />
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{FACTS[id].label}</p>
                    <SourceCaption id={id} />
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="border-t border-border/60">
            <div className="mx-auto w-full max-w-5xl px-5 py-14">
              <h2 className="text-xl font-semibold tracking-tight">Neutral by design</h2>
              <div className="mt-4 grid gap-5 md:grid-cols-3">
                {NEUTRALITY.map((n) => (
                  <div key={n.title} className="rounded-xl border bg-card p-5">
                    <h3 className="font-semibold">{n.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{n.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="border-t border-border/60">
            <div className="mx-auto w-full max-w-3xl px-5 py-14">
              <h2 className="text-xl font-semibold tracking-tight">Questions</h2>
              <div className="mt-4 divide-y rounded-xl border bg-card">
                {FAQ_PLATFORM.map((f) => (
                  <details key={f.q} className="p-5">
                    <summary className="cursor-pointer font-medium">{f.q}</summary>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
                  </details>
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
