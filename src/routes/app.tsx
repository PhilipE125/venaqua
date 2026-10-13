import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ChevronDown, Compass, Folder, LifeBuoy, LogOut, BookOpen, Radio, Search, Scale, X } from "lucide-react";
import { MapExperience } from "@/components/MapExperience";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useApp } from "@/lib/state";
import { useWorkspace } from "@/lib/workspace";
import { useSignOut } from "@/lib/use-sign-out";

export const Route = createFileRoute("/app")({
  head: () => ({ meta: [
    { title: "Workspace · Venaqua" },
    { name: "description", content: "Your Venaqua workspace for exploring, qualifying and progressing water-reuse projects." },
    { property: "og:title", content: "Workspace · Venaqua" },
    { property: "og:description", content: "Explore the map, save opportunities and manage your reuse pipeline." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: () => <RequireAuth><MapExperience nav={<WorkspaceNav />} overlay={<Onboarding />} /></RequireAuth>,
});

const LATER = [["Searches", Search], ["Signals", Radio], ["Comparables", Scale]] as const;

function WorkspaceNav() {
  const { setPanelOpen } = useApp();
  const { workspace, user, setContact, count } = useWorkspace();
  const signOut = useSignOut();
  return <nav aria-label="Workspace" className="relative z-30 flex shrink-0 items-center gap-1 overflow-x-auto border-b bg-card px-3 py-1.5 md:px-6">
    <Button variant="secondary" size="sm"><Compass />Explore</Button>
    {LATER.map(([label, Icon]) => <Tooltip key={label}><TooltipTrigger asChild><span><Button variant="ghost" size="sm" disabled><Icon />{label}</Button></span></TooltipTrigger><TooltipContent>Available on Market Access and above</TooltipContent></Tooltip>)}
    <Button asChild variant="ghost" size="sm"><Link to="/projects"><Folder />Projects{count > 0 && <span className="tnum text-xs text-primary">{count}</span>}</Link></Button>
    <Button variant="ghost" size="sm" onClick={() => setPanelOpen(true)}><BookOpen />Data & methodology</Button>
    <Button variant="ghost" size="sm" onClick={() => setContact("Help with my workspace")}><LifeBuoy />Help</Button>
    <div className="ml-auto" />
    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="shrink-0"><span className="max-w-[160px] truncate">{workspace?.name ?? "Workspace"}</span><ChevronDown /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-60">
      <DropdownMenuLabel className="font-normal"><p className="text-sm font-medium">{workspace?.name ?? "Workspace"}</p><p className="truncate text-xs text-muted-foreground">{user?.email}</p><Badge variant="outline" className="mt-2">{workspace?.plan ?? "Free Explorer"}</Badge></DropdownMenuLabel>
      <DropdownMenuSeparator /><DropdownMenuItem asChild><Link to="/pricing">Plans & pricing</Link></DropdownMenuItem><DropdownMenuItem onClick={signOut}><LogOut />Sign out</DropdownMenuItem>
    </DropdownMenuContent></DropdownMenu>
  </nav>;
}

const STEPS = [["map", "Search a plant, company or city"], ["analysis", "Open a full opportunity analysis"], ["project", "Save an opportunity to Projects"]] as const;
function Onboarding() {
  const { workspace, count, updateOnboarding } = useWorkspace();
  const done = (workspace?.onboarding ?? {}) as Record<string, boolean>;
  if (!workspace || done.dismissed) return null;
  const isDone = (k: string) => done[k] || (k === "project" && count > 0);
  return <aside aria-label="Getting started" className="panel absolute bottom-24 left-3 z-20 w-72 rounded-lg p-4 shadow-map-panel md:left-5">
    <div className="flex items-start justify-between"><p className="text-sm font-semibold">Get started with Venaqua</p><Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Dismiss checklist" onClick={() => updateOnboarding("dismissed")}><X /></Button></div>
    <ul className="mt-3 space-y-2">{STEPS.map(([k, label]) => <li key={k}><button className="flex w-full items-center gap-2 text-left text-xs" onClick={() => updateOnboarding(k)}><span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${isDone(k) ? "border-primary bg-primary text-primary-foreground" : ""}`}>{isDone(k) && <Check className="h-3 w-3" />}</span><span className={isDone(k) ? "text-muted-foreground line-through" : ""}>{label}</span></button></li>)}</ul>
  </aside>;
}
