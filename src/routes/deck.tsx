import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Maximize } from "lucide-react";
import { Bar, BarChart, LabelList, ResponsiveContainer, XAxis } from "recharts";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/deck")({
  validateSearch: (s: Record<string, unknown>): { slide: number } => ({ slide: Number(s["slide"]) === 2 ? 2 : 1 }),
  head: () => ({ meta: [
    { title: "Market and financials deck · Venaqua" },
    { name: "description", content: "Venaqua market opportunity and five-year financial projections." },
    { property: "og:title", content: "Market and financials deck · Venaqua" },
    { property: "og:description", content: "European water-reuse market, addressable market and Venaqua ARR projections." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: Deck,
});

// Figures supplied by the team: market projection in chat; TAM/SAM/SOM and projections from Venaqua_market_model_v4.xlsx (Value pricing scenario).
const ARR = [["Y1 2027", 0.163, 7], ["Y2 2028", 0.795, 30], ["Y3 2029", 2.315, 67], ["Y4 2030", 5.45, 117], ["Y5 2031", 10.43, 176]].map(([year, arr, accounts]) => ({ year, arr, accounts }));
const MIX = [["Utilities & plant operators", 4.14, 25], ["Finance & risk", 2.01, 10], ["Public water authorities", 1.75, 7], ["Water-intensive companies", 1.45, 126], ["Industrial clusters", 1.07, 8]] as const;
const GEO = [["Catalonia", "€9.2M", "€1.37M"], ["Spain", "€84.9M", "€5.09M"], ["Europe", "€537.8M", "€10.43M"]];

function Slide({ n, children }: { n: number; children: ReactNode }) {
  return <div className="slide-content bg-background p-[96px] text-foreground">{children}<div className="absolute bottom-[48px] left-[96px] right-[96px] flex justify-between text-muted-foreground"><span className="slide-chrome">Venaqua · Market model v4, Value pricing scenario</span><span className="slide-chrome tnum">{n} / 2</span></div></div>;
}

function MarketSlide() {
  return <Slide n={1}>
    <p className="slide-kicker text-primary">Market research and opportunity</p>
    <h1 className="slide-title mt-6 max-w-[1500px]">Europe's water-reuse market more than doubles by 2031.</h1>
    <div className="mt-16 grid grid-cols-[1fr_1.25fr] gap-[80px]">
      <div>
        <p className="slide-caption text-muted-foreground">European water recycle and reuse market</p>
        <div className="mt-4 flex items-end gap-6"><span className="slide-stat tnum">$14.8B</span><span className="slide-subtitle pb-2 text-muted-foreground">→</span><span className="slide-stat tnum text-primary">$32.7B</span></div>
        <p className="slide-body mt-4">2025 to 2031 · <span className="tnum">13.9%</span> CAGR</p>
        <div className="mt-12 border-l-4 border-primary pl-8"><p className="slide-body">Catalonia is the beachhead: 66 new regeneration stations planned to 2040 (~€407M) create a steady pipeline of siting and offtaker studies.</p></div>
      </div>
      <div>
        <div className="grid grid-cols-3 gap-6">
          {[["TAM 2031", "€1.03B", "Europe, all five customer groups"], ["SAM 2031", "€232.8M", "Water-stressed Europe our product fits"], ["SOM Year 5", "€10.43M", "Venaqua ARR in 2031"]].map(([k, v, d], i) => <div key={k} className={`rounded-2xl border p-8 ${i === 2 ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}><p className="slide-chrome opacity-80">{k}</p><p className="slide-subtitle tnum mt-4" style={{ fontSize: 56 }}>{v}</p><p className="slide-caption mt-4 opacity-80">{d}</p></div>)}
        </div>
        <table className="mt-10 w-full slide-caption"><thead><tr className="border-b text-left text-muted-foreground"><th className="py-3 font-normal">Geography</th><th className="py-3 font-normal">TAM today</th><th className="py-3 font-normal">SOM Year 5</th></tr></thead><tbody>{GEO.map(([g, t, s]) => <tr key={g} className="border-b"><td className="py-4 font-medium">{g}</td><td className="tnum py-4">{t}</td><td className="tnum py-4">{s}</td></tr>)}</tbody></table>
      </div>
    </div>
  </Slide>;
}

function FinanceSlide() {
  const max = MIX[0][1];
  return <Slide n={2}>
    <p className="slide-kicker text-primary">Financial projections</p>
    <h1 className="slide-title mt-6">From €163K to €10.43M ARR in five years.</h1>
    <div className="mt-14 grid grid-cols-[1.3fr_1fr] gap-[80px]">
      <div>
        <div className="flex gap-16"><div><p className="slide-stat tnum">7 → 176</p><p className="slide-caption mt-3 text-muted-foreground">paying accounts, Y1 to Y5</p></div><div><p className="slide-stat tnum text-primary">€59.2K</p><p className="slide-caption mt-3 text-muted-foreground">average ACV, Year-5 book</p></div></div>
        <div className="mt-10 h-[440px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={ARR} margin={{ top: 60, right: 0, left: 0, bottom: 0 }}><XAxis dataKey="year" tick={{ fontSize: 22, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} /><Bar dataKey="arr" fill="var(--primary)" radius={[8, 8, 0, 0]} isAnimationActive={false}><LabelList dataKey="arr" position="top" formatter={(v: number) => v < 1 ? `€${Math.round(v * 1000)}K` : `€${v.toFixed(2)}M`} style={{ fontSize: 24, fill: "var(--foreground)" }} /></Bar></BarChart></ResponsiveContainer></div>
      </div>
      <div>
        <p className="slide-subtitle">Year-5 revenue mix by customer group</p>
        <ul className="mt-8 space-y-7">{MIX.map(([name, arr, acc]) => <li key={name}><div className="flex justify-between slide-caption"><span>{name}</span><span className="tnum">€{arr.toFixed(2)}M · {acc} acc.</span></div><div className="mt-2 h-4 rounded-full bg-muted"><div className="h-4 rounded-full bg-primary" style={{ width: `${(arr / max) * 100}%` }} /></div></li>)}</ul>
      </div>
    </div>
  </Slide>;
}

function Deck() {
  const { slide } = Route.useSearch();
  const navigate = useNavigate({ from: "/deck" });
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const go = (n: number) => navigate({ search: { slide: Math.min(2, Math.max(1, n)) }, replace: true });
  useEffect(() => { document.title = `${slide}/2: Venaqua deck`; }, [slide]);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => { if (e) setScale(Math.min(e.contentRect.width / 1920, e.contentRect.height / 1080)); });
    ro.observe(el); return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (["ArrowRight", " ", "PageDown"].includes(e.key)) go(slide + 1); if (["ArrowLeft", "PageUp"].includes(e.key)) go(slide - 1); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [slide]);
  const touch = useRef(0);
  return <div className="flex h-dvh flex-col bg-muted">
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-4">
      <Button asChild variant="ghost" size="sm"><Link to="/"><ArrowLeft />Venaqua</Link></Button>
      <div className="flex items-center gap-1"><Button variant="ghost" size="icon" aria-label="Previous slide" disabled={slide === 1} onClick={() => go(slide - 1)}><ChevronLeft /></Button><span className="tnum text-sm">{slide} / 2</span><Button variant="ghost" size="icon" aria-label="Next slide" disabled={slide === 2} onClick={() => go(slide + 1)}><ChevronRight /></Button></div>
      <Button variant="outline" size="sm" onClick={() => box.current?.requestFullscreen()}><Maximize />Present</Button>
    </header>
    <div ref={box} className="relative min-h-0 flex-1 overflow-hidden bg-muted" onTouchStart={e => { touch.current = e.touches[0]?.clientX ?? 0; }} onTouchEnd={e => { const dx = (e.changedTouches[0]?.clientX ?? 0) - touch.current; if (Math.abs(dx) > 50) go(slide + (dx < 0 ? 1 : -1)); }}>
      <div className="absolute left-1/2 top-1/2 shadow-map-panel" style={{ width: 1920, height: 1080, marginLeft: -960, marginTop: -540, transform: `scale(${scale})` }}>{slide === 1 ? <MarketSlide /> : <FinanceSlide />}</div>
    </div>
  </div>;
}
