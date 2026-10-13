import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Building2, Compass, Factory, FolderKanban, Landmark, ListChecks, MessageCircle, Wrench } from "lucide-react";
import { MapPreview } from "@/components/MapExperience";
import { PublicFooter, PublicHeader } from "@/components/PublicHeader";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/lib/workspace";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Venaqua · Find the water-reuse projects worth building" },
      { name: "description", content: "Venaqua brings water recycling capacity, industrial demand, water stress and project constraints into one workspace to qualify reuse opportunities faster." },
      { property: "og:title", content: "Venaqua · Find the water-reuse projects worth building" },
      { property: "og:description", content: "Identify and qualify water-reuse infrastructure opportunities across Spain with a free map and a team workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const STEPS = [
  { icon: Compass, title: "Explore", text: "Find plants, water recycling capacity, industrial users and water-stress signals." },
  { icon: ListChecks, title: "Qualify", text: "Compare indicative economics, constraints, confidence and next actions." },
  { icon: FolderKanban, title: "Progress", text: "Save viable opportunities into a structured team project pipeline." },
];
const TEAMS = [
  { icon: Factory, title: "Water operators", text: "See where treated and recycled water could meet nearby industrial demand." },
  { icon: Wrench, title: "Engineering advisors", text: "Screen opportunities before committing engineering time." },
  { icon: Building2, title: "Industrial clusters", text: "Find shared-pipe options and compare reuse with mains water." },
  { icon: Landmark, title: "Public planning teams", text: "Relate reuse capacity to drought and water stress across areas." },
];
const PROOF = ["Searchable Spain and Catalonia map", "Treatment and water recycling plants", "Company and demand signals", "Water-stress layer", "Opportunity analysis", "Project workspace", "Transparent evidence labels"];

function Landing() {
  const { setContact } = useWorkspace();
  return <div className="min-h-dvh bg-background">
    <PublicHeader />
    <main>
      <section className="relative overflow-hidden border-b">
        <div className="pointer-events-none absolute inset-0 opacity-60" aria-hidden="true"><MapPreview /></div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/20" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-5 py-24 md:py-32">
          <div className="max-w-2xl">
            <p className="label-caps">Water-reuse opportunity intelligence</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">Find the water-reuse projects worth building.</h1>
            <p className="mt-5 text-lg text-muted-foreground">Venaqua brings water recycling capacity, industrial demand, water stress and project constraints into one workspace—so teams can identify and qualify reuse infrastructure opportunities faster.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link to="/explore">Explore the free map<ArrowRight /></Link></Button>
              <Button asChild size="lg" variant="outline"><Link to="/signup">Get started</Link></Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <p className="label-caps">Why Venaqua</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold">Water reuse projects often stall before engineering begins.</h2>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {["Supply and demand are fragmented across plants, permits and industrial records.", "Project teams lack a shared evidence base to agree on what is real.", "Weak opportunities absorb expensive engineering time."].map(t => <p key={t} className="border-l-2 border-primary pl-4 text-sm">{t}</p>)}
        </div>
      </section>

      <section id="how" className="scroll-mt-16 border-y bg-card">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <p className="label-caps">How it works</p>
          <h2 className="mt-3 text-3xl font-semibold">From map to project decision.</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => <li key={s.title} className="rounded-lg border bg-background p-6"><s.icon className="h-6 w-6 text-primary" /><p className="mt-4 text-xs text-muted-foreground tnum">Step {i + 1}</p><h3 className="mt-1 text-lg font-semibold">{s.title}</h3><p className="mt-2 text-sm text-muted-foreground">{s.text}</p></li>)}
          </ol>
        </div>
      </section>

      <section id="teams" className="mx-auto max-w-6xl scroll-mt-16 px-5 py-20">
        <p className="label-caps">Built for teams</p>
        <h2 className="mt-3 text-3xl font-semibold">One evidence base for everyone on the project.</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TEAMS.map(t => <div key={t.title} className="rounded-lg border p-6"><t.icon className="h-5 w-5 text-primary" /><h3 className="mt-4 font-semibold">{t.title}</h3><p className="mt-2 text-sm text-muted-foreground">{t.text}</p></div>)}
        </div>
      </section>

      <section className="border-y bg-card">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-2">
          <div><p className="label-caps">What's inside</p><h2 className="mt-3 text-3xl font-semibold">The product, as it works today.</h2><ul className="mt-6 space-y-3">{PROOF.map(p => <li key={p} className="flex items-center gap-3 text-sm"><span className="h-1.5 w-1.5 rounded-full bg-primary" />{p}</li>)}</ul></div>
          <div className="self-center rounded-lg border bg-background p-6"><p className="label-caps">Our commitment</p><p className="mt-3 text-base">Venaqua distinguishes measured data, modelled estimates and assumptions. It supports early-stage decisions; it does not replace engineering, legal or permitting review.</p></div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 text-center">
        <h2 className="mx-auto max-w-2xl text-3xl font-semibold">Start with the map. Build your reuse pipeline when you are ready.</h2>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg"><Link to="/explore">Explore the free map<ArrowRight /></Link></Button>
          <Button size="lg" variant="outline" onClick={() => setContact("")}><MessageCircle />Talk to the team</Button>
        </div>
      </section>
    </main>
    <PublicFooter />
  </div>;
}
