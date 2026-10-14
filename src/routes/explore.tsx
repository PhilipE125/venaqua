import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useEffect } from "react";
import { useApp, type Mode } from "@/lib/state";
import { Drawer } from "@/components/Drawer";
import { CompanySearch } from "@/components/Landing";
import { ModuleBar } from "@/components/ModuleBar";
import { ResultsPanel } from "@/components/ResultsPanel";
import { LayerChips } from "@/components/LayerChips";
import { Sidebar } from "@/components/Sidebar";
import { StressStrip } from "@/components/StressStrip";
import { TopBar } from "@/components/TopBar";
import { TooltipProvider } from "@/components/ui/tooltip";

const MapView = lazy(() => import("@/components/map/MapView"));

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Venaqua · Explore the free map" },
      { name: "description", content: "Find water reuse opportunities across Spain, evaluate project economics and develop a feasibility case with the Venaqua team." },
      { property: "og:title", content: "Venaqua · Industrial water reuse opportunities" },
      { property: "og:description", content: "Explore supply and buyers, compare water options and turn promising opportunities into validated projects." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { module?: Exclude<Mode, "all"> } => (typeof s.module === "string" && /^q[1-5]$/.test(s.module) ? { module: s.module as Exclude<Mode, "all"> } : {}),
  component: Index,
});

function MapFallback() {
  return <div className="h-full w-full animate-pulse bg-muted" />;
}

function Index() {
  const { module } = Route.useSearch();
  const { setMode } = useApp();
  // Landing-page module links open the map with that module active.
  useEffect(() => { if (module) setMode(module); }, [module]); // eslint-disable-line react-hooks/exhaustive-deps
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
              <ModuleBar />
              <ResultsPanel />
              <LayerChips />
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
