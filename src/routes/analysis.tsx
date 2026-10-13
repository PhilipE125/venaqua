import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowLeft, Folder, Droplets } from "lucide-react";
import { AnalysisWorkspace } from "@/components/Drawer";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useApp, type Selection } from "@/lib/state";

type Kind = NonNullable<Selection>["kind"];
const kinds: Kind[] = ["company", "wwtp", "regen", "region", "comarca"];

export const Route = createFileRoute("/analysis")({
  validateSearch: (search: Record<string, unknown>): { kind: Kind; id: string } => ({
    kind: kinds.includes(search['kind'] as Kind) ? search['kind'] as Kind : "company",
    id: typeof search['id'] === "string" ? search['id'] : "",
  }),
  head: () => ({ meta: [
    { title: "Opportunity analysis · Reuse Match" },
    { name: "description", content: "Evaluate water reuse economics, project steps and source evidence for a company or treatment plant." },
    { property: "og:title", content: "Opportunity analysis · Reuse Match" },
    { property: "og:description", content: "Compare water options and validate the next steps for an industrial reuse project." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: AnalysisPage,
});

function AnalysisPage() {
  const { kind, id } = Route.useSearch();
  const { selection, select } = useApp();
  useEffect(() => {
    if (!id || selection?.id === id && selection.kind === kind) return;
    select(kind === "region" ? { kind, id: "catalonia" } : { kind, id });
  }, [kind, id]);
  return <TooltipProvider><div className="min-h-dvh bg-background">
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b bg-background px-4 sm:px-8">
      <Button variant="ghost" asChild><Link to="/" resetScroll={false}><ArrowLeft />Back to map</Link></Button>
      <span className="hidden items-center gap-2 font-semibold sm:flex"><Droplets className="h-5 w-5 text-primary" />Reuse Match / Analysis</span>
      <Button variant="outline" asChild><Link to="/projects"><Folder />Projects</Link></Button>
    </header>
    {id ? <AnalysisWorkspace key={`${kind}:${id}`} /> : <div className="mx-auto max-w-xl px-6 py-16"><h1 className="text-2xl font-semibold">Select an opportunity</h1><p className="mt-3 text-muted-foreground">Choose a company or treatment plant on the map.</p><Button asChild className="mt-6"><Link to="/">Explore the map</Link></Button></div>}
  </div></TooltipProvider>;
}