import { Link } from "@tanstack/react-router";
import { ChevronDown, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspace } from "@/lib/workspace";

const triggerClass =
  "inline-flex items-center gap-1 rounded-md px-3 py-2 outline-none transition-colors hover:text-foreground focus-visible:text-foreground data-[state=open]:text-foreground";
const linkClass = "rounded-md px-3 py-2 transition-colors hover:text-foreground";

export function PublicHeader() {
  const { setAuthOpen, setContact } = useWorkspace();
  return (
    <header className="relative z-10 flex items-center justify-between border-b border-border/60 bg-background/70 px-5 py-3 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2">
          <Droplets className="h-5 w-5 text-primary" />
          <span className="font-semibold tracking-tight">Venaqua</span>
        </Link>
        <nav className="hidden items-center gap-1 text-sm text-muted-foreground md:flex">
          <DropdownMenu>
            <DropdownMenuTrigger className={triggerClass}>
              Platform <ChevronDown className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem asChild>
                <Link to="/explore">Explore the free map</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/projects">Projects</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <a href="/#how" className={linkClass}>How it works</a>
          <Link to="/pricing" className={linkClass}>Pricing</Link>
          <DropdownMenu>
            <DropdownMenuTrigger className={triggerClass}>
              Resources <ChevronDown className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => setContact("")}>
                Talk to the team
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="mailto:support@venaqua.com">Email the team</a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <a href="/#why" className={linkClass}>About us</a>
        </nav>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => setAuthOpen(true)}>Sign in</Button>
        <Button size="sm" onClick={() => setAuthOpen(true)}>Get started — full version</Button>
      </div>
    </header>
  );
}
