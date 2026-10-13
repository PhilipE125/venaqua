import { Moon, Settings2, Sparkles, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useApp } from "@/lib/state";
import { SettingsDialog } from "./SettingsDialog";

export function TopBar() {
  const { dark, setDark } = useApp();
  return (
    <header className="panel flex h-12 shrink-0 items-center justify-between border-x-0 border-t-0 px-4">
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full border-[3px] border-primary" />
          <span className="text-sm font-semibold tracking-tight">Reuse Match</span>
        </div>
        <Select value="cat">
          <SelectTrigger className="h-8 w-[200px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="cat">Catalonia</SelectItem>
            <SelectItem value="es" disabled>Spain · coming soon</SelectItem>
            <SelectItem value="eea" disabled>Europe (EEA) · coming soon</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button variant="outline" size="sm" disabled className="h-8 gap-1.5 text-xs">
                <Sparkles className="h-3.5 w-3.5" /> Ask the analyst
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>Coming next</TooltipContent>
        </Tooltip>
        <SettingsDialog>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Settings">
            <Settings2 className="h-4 w-4" />
          </Button>
        </SettingsDialog>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Toggle theme" onClick={() => setDark(!dark)}>
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
}
