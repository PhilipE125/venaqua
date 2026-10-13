import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Drawer } from "@/components/Drawer";
import { CompanySearch, QuestionBar } from "@/components/Landing";
import { Sidebar } from "@/components/Sidebar";
import { StressStrip } from "@/components/StressStrip";
import { TopBar } from "@/components/TopBar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppStateProvider } from "@/lib/state";

const MapView = lazy(() => import("@/components/map/MapView"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Reuse Match · Is reclaimed water cheaper than your tariff?" },
      { name: "description", content: "Map that matches reclaimed wastewater supply in Catalonia with nearby companies that need water, using live public data." },
      { property: "og:title", content: "Reuse Match · Is reclaimed water cheaper than your tariff?" },
      { property: "og:description", content: "Match treatment and regeneration plants with nearby water users, ranked by an opportunity score." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function MapFallback() {
  return <div className="h-full w-full animate-pulse bg-muted" />;
}

function Index() {
  return (
    <AppStateProvider>
      <TooltipProvider delayDuration={200}>
        <div className="flex h-screen min-w-[1280px] flex-col overflow-hidden">
          <TopBar />
          <div className="flex min-h-0 flex-1">
            <Sidebar />
            <main className="relative min-w-0 flex-1">
              <ClientOnly fallback={<MapFallback />}>
                <Suspense fallback={<MapFallback />}>
                  <MapView />
                </Suspense>
              </ClientOnly>
              <StressStrip />
              <QuestionBar />
              <Drawer />
              <CompanySearch />
            </main>
          </div>
        </div>
      </TooltipProvider>
    </AppStateProvider>
  );
}
