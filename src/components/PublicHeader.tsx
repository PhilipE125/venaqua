import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Droplets, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWorkspace } from "@/lib/workspace";

type Key = "platform" | "how" | "pricing" | "resources" | "about";
type Panel = Key | "menu";

const ITEMS: { key: Key; label: string }[] = [
  { key: "platform", label: "Platform" },
  { key: "how", label: "How it works" },
  { key: "pricing", label: "Pricing" },
  { key: "resources", label: "Resources" },
  { key: "about", label: "About us" },
];

export function PublicHeader() {
  const { setAuthOpen, setContact } = useWorkspace();
  const [open, setOpen] = useState<Panel | null>(null);
  const close = () => setOpen(null);

  const content: Record<Key, { title: string; body: string; actions: React.ReactNode }> = {
    platform: {
      title: "The Venaqua platform",
      body: "A live map of water recycling plants, industrial water users and water stress. Spot reuse opportunities, then save and develop them as projects.",
      actions: (
        <>
          <Button asChild size="sm"><Link to="/platform" onClick={close}>See the platform</Link></Button>
          <Button asChild size="sm" variant="outline"><Link to="/explore" onClick={close}>Explore the free map</Link></Button>
        </>
      ),
    },
    how: {
      title: "How it works",
      body: "Explore the map to find supply near demand. Qualify each match with economics and evidence. Progress the best ones into a project with the Venaqua team.",
      actions: <Button asChild size="sm"><a href="/#how" onClick={close}>Read more</a></Button>,
    },
    pricing: {
      title: "Pricing",
      body: "The map is free. Paid plans add full economics, private project pipelines and feasibility briefs for teams.",
      actions: <Button asChild size="sm"><Link to="/pricing" onClick={close}>See plans</Link></Button>,
    },
    resources: {
      title: "Resources",
      body: "Every figure is labelled measured, modelled or estimated, with its public source. Questions? The team is happy to help.",
      actions: (
        <>
          <Button size="sm" onClick={() => { close(); setContact(""); }}>Talk to the team</Button>
          <Button asChild size="sm" variant="outline"><a href="mailto:support@venaqua.com">Email us</a></Button>
        </>
      ),
    },
    about: {
      title: "About Venaqua",
      body: "We help water operators, industry and planners find the reuse projects worth building — starting in Spain, expanding across Europe.",
      actions: <Button asChild size="sm"><a href="/#why" onClick={close}>Why Venaqua</a></Button>,
    },
  };

  const current = open && open !== "menu" ? content[open] : null;

  return (
    <header className="relative z-10 border-b border-border/60 bg-background/75 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-5">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <Droplets className="h-5 w-5 text-primary" />
          <span className="font-semibold tracking-tight">Venaqua</span>
        </Link>
        <nav className="hidden items-center gap-0 text-[13px] text-muted-foreground md:flex">
          {ITEMS.map((i) => (
            <button
              key={i.key}
              onClick={() => setOpen(i.key)}
              className="whitespace-nowrap rounded-full px-2.5 py-1.5 transition-colors hover:bg-muted hover:text-foreground"
            >
              {i.label}
            </button>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button variant="ghost" size="sm" className="whitespace-nowrap" onClick={() => setAuthOpen(true)}>Sign in</Button>
          <Button size="sm" className="whitespace-nowrap" onClick={() => setAuthOpen(true)}>Get started</Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" aria-label="Open menu" onClick={() => setOpen("menu")}>
            <Menu />
          </Button>
        </div>
      </div>
      <Dialog open={!!open} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-sm">
          {open === "menu" ? (
            <>
              <DialogHeader>
                <DialogTitle>Menu</DialogTitle>
                <DialogDescription className="leading-relaxed">Short guides to what Venaqua does and how to start.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-0.5 pt-1">
                {ITEMS.map((i) => (
                  <button
                    key={i.key}
                    onClick={() => setOpen(i.key)}
                    className="rounded-lg px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
                  >
                    {i.label}
                  </button>
                ))}
              </div>
            </>
          ) : current && (
            <>
              <DialogHeader>
                <DialogTitle>{current.title}</DialogTitle>
                <DialogDescription className="leading-relaxed">{current.body}</DialogDescription>
              </DialogHeader>
              <div className="flex flex-wrap gap-2 pt-1">{current.actions}</div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </header>
  );
}
