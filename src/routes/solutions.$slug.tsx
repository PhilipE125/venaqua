import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/PublicHeader";
import { useWorkspace } from "@/lib/workspace";
import { SOLUTIONS } from "@/content/venaqua";

export const Route = createFileRoute("/solutions/$slug")({
  loader: ({ params }) => {
    const solution = SOLUTIONS.find((s) => s.slug === params.slug);
    if (!solution) throw notFound();
    return { solution };
  },
  head: ({ loaderData }) => {
    const s = loaderData?.solution;
    const title = s ? `Venaqua · ${s.name}` : "Venaqua · Solution";
    const desc = s ? `${s.tagline} ${s.price}.` : "Venaqua water-reuse solutions.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(s ? [] : [{ name: "robots", content: "noindex" }]),
      ],
    };
  },
  notFoundComponent: () => (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
      <p>This solution doesn't exist.</p>
      <Link to="/pricing" className="text-primary underline">See pricing</Link>
    </div>
  ),
  component: SolutionPage,
});

function SolutionPage() {
  const { solution: s } = Route.useLoaderData();
  const { setContact } = useWorkspace();
  const others = SOLUTIONS.filter((o) => o.slug !== s.slug);
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-16">
        <Link to="/pricing" className="mt-8 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All pricing options
        </Link>
        <section className="pb-10 pt-6">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">{s.name} · {s.price}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{s.tagline}</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">{s.intro}</p>
          <Button className="mt-6" onClick={() => setContact(s.topic)}>{s.cta}</Button>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          {s.includes.map((i) => (
            <div key={i.title} className="rounded-xl border bg-card p-5">
              <h3 className="font-semibold">{i.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{i.text}</p>
            </div>
          ))}
        </section>

        {s.tiers && (
          <section className="mt-12">
            <h2 className="text-xl font-semibold tracking-tight">Options</h2>
            <div className="mt-4 grid gap-5 md:grid-cols-2">
              {s.tiers.map((t) => (
                <div key={t.name} className="rounded-xl border bg-card p-5">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-semibold">{t.name}</h3>
                    <span className="text-sm font-semibold tabular-nums">{t.price}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{t.text}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-12 grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Who it's for</h2>
            <ul className="mt-4 flex flex-col gap-2">
              {s.who.map((w) => (
                <li key={w} className="flex items-start gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{w}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">How it works</h2>
            <ol className="mt-4 flex flex-col gap-3">
              {s.steps.map((st, i) => (
                <li key={st.title} className="flex gap-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{i + 1}</span>
                  <span><span className="font-medium">{st.title}.</span> <span className="text-muted-foreground">{st.text}</span></span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mt-12 rounded-xl border bg-muted/40 p-5">
          <h2 className="flex items-center gap-2 font-semibold"><Info className="h-4 w-4" /> Good to know</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
            {s.limits.map((l) => <li key={l}>{l}</li>)}
          </ul>
        </section>

        <section className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t pt-8">
          <div className="text-sm text-muted-foreground">
            Also see:{" "}
            {others.map((o, i) => (
              <span key={o.slug}>
                {i > 0 && " · "}
                <Link to="/solutions/$slug" params={{ slug: o.slug }} className="font-medium text-primary underline">{o.name}</Link>
              </span>
            ))}
            {" "}· or the <Link to="/explore" className="font-medium text-primary underline">free map</Link>
          </div>
          <Button onClick={() => setContact(s.topic)}>{s.cta}</Button>
        </section>
      </main>
    </div>
  );
}
