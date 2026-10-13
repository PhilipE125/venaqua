import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Droplets, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/deck")({
  head: () => ({
    meta: [
      { title: "Venaqua · Investor deck" },
      { name: "description", content: "Venaqua market opportunity and financial projections: European water reuse market, addressable market and five-year ARR ramp." },
      { property: "og:title", content: "Venaqua · Investor deck" },
      { property: "og:description", content: "European water reuse market opportunity and Venaqua five-year financial projections." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Deck,
  validateSearch: (search: Record<string, unknown>) => ({
    slide: typeof search.slide === "number" ? search.slide : undefined,
  }),
});

const SLIDES = [MarketSlide, FinancialsSlide];
const TITLES = ["Market opportunity", "Financial projections"];

function MarketSlide() {
  return (
    <div className="slide-content flex flex-col bg-background text-foreground">
      <header className="flex items-center justify-between px-24 pt-16">
        <span className="slide-kicker text-primary">Venaqua · Market opportunity</span>
        <span className="slide-chrome text-muted-foreground">1 / 2</span>
      </header>
      <div className="flex flex-1 items-center gap-20 px-24">
        <div className="max-w-[900px]">
          <h1 className="slide-title font-semibold">Water reuse is becoming a core European market</h1>
          <p className="slide-body mt-10 text-muted-foreground">
            The European water recycle and reuse market is projected to grow from <span className="font-semibold text-foreground">$14.8B in 2025</span> to <span className="font-semibold text-foreground">$32.7B by 2031</span> — a 13.9% compound annual growth rate.
          </p>
          <p className="slide-caption mt-8 text-muted-foreground">
            Catalonia is our beachhead: live public data on treatment plants, reuse volumes, industrial demand and drought stress lets us screen real opportunities today.
          </p>
        </div>
        <div className="flex flex-1 flex-col gap-8">
          {[
            { label: "TAM · Europe", value: "€1.03B", note: "Total addressable market" },
            { label: "SAM · Spain", value: "€232.8M", note: "Serviceable addressable market" },
            { label: "SOM · Catalonia first", value: "€10.43M", note: "Serviceable obtainable market" },
          ].map((s) => (
            <div key={s.label} className="rounded-3xl border bg-card p-10">
              <div className="slide-kicker text-muted-foreground">{s.label}</div>
              <div className="slide-subtitle mt-3 font-semibold text-primary">{s.value}</div>
              <div className="slide-caption mt-2 text-muted-foreground">{s.note}</div>
            </div>
          ))}
        </div>
      </div>
      <footer className="slide-footer px-24 pb-12 text-muted-foreground">
        Sources: European market projection (team figure — citation to be added); Venaqua market model. TAM/SAM/SOM from the Venaqua market model spreadsheet.
      </footer>
    </div>
  );
}

function FinancialsSlide() {
  const arr = [
    { year: "Y1", value: 0.163, label: "€163K" },
    { year: "Y2", value: 0.9, label: "€0.9M" },
    { year: "Y3", value: 2.6, label: "€2.6M" },
    { year: "Y4", value: 5.8, label: "€5.8M" },
    { year: "Y5", value: 10.43, label: "€10.43M" },
  ];
  const max = 10.43;
  const icps = [
    "Utilities & plant operators",
    "Public water authorities",
    "Industrial clusters",
    "Water-intensive companies",
    "Finance & risk",
  ];
  return (
    <div className="slide-content flex flex-col bg-background text-foreground">
      <header className="flex items-center justify-between px-24 pt-16">
        <span className="slide-kicker text-primary">Venaqua · Financial projections</span>
        <span className="slide-chrome text-muted-foreground">2 / 2</span>
      </header>
      <div className="flex flex-1 items-center gap-20 px-24">
        <div className="flex-1">
          <h1 className="slide-title font-semibold">€10.43M ARR by year five</h1>
          <div className="mt-14 flex h-[380px] items-end gap-10">
            {arr.map((b) => (
              <div key={b.year} className="flex flex-1 flex-col items-center gap-4">
                <span className="slide-caption font-semibold">{b.label}</span>
                <div className="w-full rounded-t-2xl bg-primary" style={{ height: `${Math.max(6, (b.value / max) * 280)}px` }} />
                <span className="slide-caption text-muted-foreground">{b.year}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex w-[560px] flex-col gap-8">
          <div className="rounded-3xl border bg-card p-10">
            <div className="slide-kicker text-muted-foreground">Paying accounts</div>
            <div className="slide-subtitle mt-3 font-semibold">7 → 176</div>
            <div className="slide-caption mt-2 text-muted-foreground">Year one to year five</div>
          </div>
          <div className="rounded-3xl border bg-card p-10">
            <div className="slide-kicker text-muted-foreground">Average contract value</div>
            <div className="slide-subtitle mt-3 font-semibold">€59.2K</div>
            <div className="slide-caption mt-2 text-muted-foreground">Average ACV across segments</div>
          </div>
          <div className="rounded-3xl border bg-card p-10">
            <div className="slide-kicker text-muted-foreground">Revenue mix · five ICPs</div>
            <ul className="slide-caption mt-4 flex flex-col gap-2 text-muted-foreground">
              {icps.map((i) => <li key={i}>· {i}</li>)}
            </ul>
          </div>
        </div>
      </div>
      <footer className="slide-footer px-24 pb-12 text-muted-foreground">
        Source: Venaqua market model spreadsheet. Figures are projections, not commitments.
      </footer>
    </div>
  );
}

function Deck() {
  const { slide } = Route.useSearch();
  const navigate = useNavigate();
  const [scale, setScale] = useState(0.5);
  const index = Math.min(Math.max(slide ?? 0, 0), SLIDES.length - 1);
  const Slide = SLIDES[index];

  const go = useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(next, 0), SLIDES.length - 1);
      navigate({ to: "/deck", search: { slide: clamped }, replace: true });
    },
    [navigate],
  );

  useEffect(() => {
    const onResize = () => setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080) * 0.94);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    document.title = `${index + 1}/${SLIDES.length} — ${TITLES[index]} · Venaqua deck`;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go]);

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-muted">
      <div className="relative z-10 flex items-center justify-between border-b bg-card px-4 py-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/"><ArrowLeft />Back to Venaqua</Link>
        </Button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Droplets className="h-4 w-4 text-primary" />
          <span className="font-medium text-foreground">Investor deck</span>
          <span>· {index + 1} / {SLIDES.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Previous slide" disabled={index === 0} onClick={() => go(index - 1)}><ArrowLeft /></Button>
          <Button variant="ghost" size="icon" aria-label="Next slide" disabled={index === SLIDES.length - 1} onClick={() => go(index + 1)}><ArrowRight /></Button>
          <Button variant="ghost" size="icon" aria-label="Present fullscreen" onClick={() => document.documentElement.requestFullscreen()}><Maximize2 /></Button>
        </div>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <div className="slide-wrapper shadow-2xl" style={{ "--scale": scale } as React.CSSProperties}>
          <Slide />
        </div>
      </div>
    </div>
  );
}
