import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Download, Droplets, FolderOpen, MessageCircle, Moon, MoreHorizontal, Search, Settings2, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useApp } from "@/lib/state";
import { useWorkspace } from "@/lib/workspace";
import { RegionPicker } from "./RegionPicker";
import { SettingsDialog } from "./SettingsDialog";
import { ExportDialog } from "./ExportDialog";

export function TopBar() {
  const { dark, setDark, setSearchOpen } = useApp();
  const { setContact, count, user, setAuthOpen } = useWorkspace();
  const navigate = useNavigate();
  const [exportOpen, setExportOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  return <header className="relative z-40 flex min-h-14 shrink-0 items-center justify-between gap-3 border-b bg-card px-4 md:px-6">
    <div className="flex shrink-0 items-center gap-3 md:gap-5">
      <Link to="/" className="flex items-center gap-2" aria-label="Venaqua home"><Droplets className="h-6 w-6 text-primary" /><span className="text-lg font-semibold">Venaqua</span></Link>
      <div className="hidden sm:block"><RegionPicker /></div>
    </div>
    <Button variant="outline" className="h-9 min-w-0 justify-start gap-2 text-muted-foreground md:w-[340px] lg:w-[390px]" onClick={() => setSearchOpen(true)}><Search /><span className="hidden truncate text-xs md:block">Search a company, plant, city or project</span><span className="sr-only md:hidden">Search a company, plant, city or project</span></Button>
    <div className="flex shrink-0 items-center gap-1 md:gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More options"><MoreHorizontal /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onSelect={() => navigate({ to: "/projects" })}><FolderOpen />Projects{count > 0 && <span className="tnum ml-auto text-xs text-primary">{count}</span>}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => (user ? setExportOpen(true) : setAuthOpen(true))}><Download />Export data</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setSettingsOpen(true)}><Settings2 />Settings</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDark(!dark)}>{dark ? <Sun /> : <Moon />}{dark ? "Light theme" : "Dark theme"}</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setContact("")}><MessageCircle />Talk to the team</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {!user && <><Button variant="ghost" size="sm" onClick={() => setAuthOpen(true)}>Sign in</Button><Button size="sm" onClick={() => setAuthOpen(true)}><span className="hidden sm:inline">Get started — full version</span><span className="sm:hidden">Get started</span></Button></>}
    </div>
    <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
    <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
  </header>;
}
