import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/lib/workspace";
import { Drawer } from "@/components/Drawer";
import { CompanySearch, QuestionBar } from "@/components/Landing";
import { Sidebar } from "@/components/Sidebar";
import { StressStrip } from "@/components/StressStrip";
import { TopBar } from "@/components/TopBar";
import { TooltipProvider } from "@/components/ui/tooltip";

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
  component: Index,
});

function MapFallback() {
  return <div className="h-full w-full animate-pulse bg-muted" />;
}

function FreeMapBanner() {
  const { user, setAuthOpen } = useWorkspace();
  const [dismissed, setDismissed] = useState(false);
  if (user || dismissed) return null;
  return (
    <div className="pointer-events-auto absolute left-1/2 top-3 z-30 flex w-[min(92%,560px)] -translate-x-1/2 items-center gap-3 rounded-xl border bg-card/95 px-4 py-2.5 shadow-lg backdrop-blur">
      <Sparkles className="h-4 w-4 shrink-0 text-primary" />
      <p className="min-w-0 flex-1 text-xs leading-snug text-muted-foreground">
        You're viewing the <span className="font-medium text-foreground">free map</span>. Create an account to save projects, run full economics and get a feasibility brief.
      </p>
      <Button size="sm" className="shrink-0" onClick={() => setAuthOpen(true)}>Get started</Button>
      <button aria-label="Dismiss" className="shrink-0 text-muted-foreground hover:text-foreground" onClick={() => setDismissed(true)}><X className="h-4 w-4" /></button>
    </div>
  );
}

function Index() {
  return (
      <TooltipProvider delayDuration={200}>
        <div className="map-shell flex flex-col overflow-hidden">
          <TopBar />
          <div className="relative flex min-h-0 flex-1">
            <main className="relative min-w-0 flex-1">
              <ClientOnly fallback={<MapFallback />}>
                <Suspense fallback={<MapFallback />}>
                  <MapView />
                </Suspense>
              </ClientOnly>
              <FreeMapBanner />
              <QuestionBar />
              <Sidebar />
              <StressStrip />
              <Drawer />
              <CompanySearch />
            </main>
          </div>
        </div>
      </TooltipProvider>
  );
}
