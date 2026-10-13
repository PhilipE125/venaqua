import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
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
