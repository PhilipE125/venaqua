import { Link } from "@tanstack/react-router";
import { Droplets, FolderOpen, MessageCircle, Moon, Search, Settings2, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/lib/state";
import { useWorkspace } from "@/lib/workspace";
import { SettingsDialog } from "./SettingsDialog";

export function TopBar() {
  const { dark, setDark, setSearchOpen, region, setRegion } = useApp();
  const { setContact, count, user, setAuthOpen } = useWorkspace();
  return <header className="relative z-40 flex min-h-16 shrink-0 items-center justify-between gap-3 border-b bg-card px-4 md:px-6">
    <div className="flex shrink-0 items-center gap-3 md:gap-6"><Link to="/" className="flex items-center gap-2"><Droplets className="h-6 w-6 text-primary" /><span className="text-lg font-semibold">Venaqua</span></Link><div className="hidden sm:block"><Select value={region} onValueChange={v => setRegion(v as "es" | "cat")}><SelectTrigger className="h-8 w-32 border-0 bg-muted text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="es">Spain</SelectItem><SelectItem value="cat">Catalonia</SelectItem></SelectContent></Select></div></div>
    <Button variant="outline" className="h-9 min-w-0 justify-start gap-2 text-muted-foreground md:w-[340px] lg:w-[390px]" onClick={() => setSearchOpen(true)}><Search /><span className="hidden truncate md:block text-xs">Search a company, plant, city or project</span><span className="md:hidden sr-only">Search a company, plant, city or project</span></Button>
    <div className="flex shrink-0 items-center gap-1 md:gap-2"><Button asChild variant="ghost" size="sm"><Link to="/projects"><FolderOpen /><span className="hidden sm:inline">Projects</span>{count > 0 && <span className="tnum text-xs text-primary">{count}</span>}</Link></Button><Button variant="outline" size="sm" className="hidden lg:flex" onClick={() => setContact("")}><MessageCircle />Talk to the team</Button><SettingsDialog><Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Settings"><Settings2 /></Button></SettingsDialog><Button variant="ghost" size="icon" className="hidden h-8 w-8 sm:inline-flex" aria-label="Toggle theme" onClick={() => setDark(!dark)}>{dark ? <Sun /> : <Moon />}</Button>{!user && <Button variant="ghost" size="sm" className="hidden xl:inline-flex" onClick={() => setAuthOpen(true)}>Sign in</Button>}</div>
  </header>;
}
