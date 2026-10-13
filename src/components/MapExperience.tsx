import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, type ReactNode } from "react";
import { Drawer } from "@/components/Drawer";
import { CompanySearch, QuestionBar } from "@/components/Landing";
import { Sidebar } from "@/components/Sidebar";
import { StressStrip } from "@/components/StressStrip";
import { TopBar } from "@/components/TopBar";
import { TooltipProvider } from "@/components/ui/tooltip";

const MapView = lazy(() => import("@/components/map/MapView"));

function MapFallback() {
  return <div className="h-full w-full animate-pulse bg-muted" />;
}

/** The single map experience, shared by the public Explorer and the signed-in workspace. */
export function MapExperience({ nav, overlay }: { nav?: ReactNode; overlay?: ReactNode }) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="map-shell flex flex-col overflow-hidden">
        <TopBar />
        {nav}
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
            {overlay}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}

export function MapPreview() {
  return <ClientOnly fallback={<MapFallback />}><Suspense fallback={<MapFallback />}><MapView /></Suspense></ClientOnly>;
}
