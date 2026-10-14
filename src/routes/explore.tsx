import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { X } from "lucide-react";
import { useWorkspace } from "@/lib/workspace";
import { Drawer } from "@/components/Drawer";
import { CompanySearch, QuestionBar } from "@/components/Landing";
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
  component: Index,
});

function MapFallback() {
  return <div className="h-full w-full animate-pulse bg-muted" />;
}

const BANNER_KEY = "venaqua:free-banner-dismissed";
function FreeMapBanner() {
  const { user, setAuthOpen } = useWorkspace();
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => { setDismissed(localStorage.getItem(BANNER_KEY) === "1"); }, []);
  if (user || dismissed) return null;
  const close = () => { localStorage.setItem(BANNER_KEY, "1"); setDismissed(true); };
  return (
    <div className="pointer-events-auto absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border bg-card/95 py-1 pl-3 pr-1.5 text-xs shadow-md backdrop-blur">
      <span className="text-muted-foreground">Free map</span>
      <button className="font-medium text-primary hover:underline" onClick={() => setAuthOpen(true)}>Save projects with an account</button>
      <button aria-label="Dismiss" className="rounded-full p-1 text-muted-foreground hover:text-foreground" onClick={close}><X className="h-3.5 w-3.5" /></button>
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
