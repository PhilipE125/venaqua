import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCompanies, useMatches, useWwtps } from "@/lib/queries";
import { useWorkspace } from "@/lib/workspace";
import { toCsv, toGeoJson, type ExportRow } from "@/lib/exportData";

function save(name: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

export function ExportDialog() {
  const { user, setAuthOpen, privateSites } = useWorkspace();
  const [open, setOpen] = useState(false);
  const plants = useWwtps().data?.features ?? [];
  const companies = useCompanies().data?.features ?? [];
  const { filtered, siteById, companyById } = useMatches();
  const sets: { id: string; label: string; rows: ExportRow[] }[] = [
    { id: "plants", label: "Treatment plants", rows: plants.map(p => ({ id: p.id, name: p.name, lat: p.lat, lon: p.lon, capacity_m3_day: p.capacity })) },
    { id: "companies", label: "Companies", rows: companies.map(c => ({ id: c.id, name: c.name, lat: c.lat, lon: c.lon, sector: c.sector })) },
    { id: "opportunities", label: "Ranked opportunities", rows: filtered.slice(0, 5000).map(m => { const s = siteById.get(m.siteId); const c = companyById.get(m.companyId); return { id: `${m.siteId}__${m.companyId}`, name: `${s?.name ?? ""} → ${c?.name ?? ""}`, lat: c?.lat ?? 0, lon: c?.lon ?? 0, plant: s?.name ?? "", company: c?.name ?? "", distance_km: Number(m.distanceKm.toFixed(2)), matched_m3_day: Math.round(m.matched), score: Number(m.score.toFixed(1)) }; }) },
    { id: "private-sites", label: "Your private sites", rows: privateSites.map(s => ({ id: s.id, name: s.name, lat: s.lat, lon: s.lon, kind: s.kind, volume_m3_day: Number(s.volume_m3_day) })) },
  ];
  return <Dialog open={open} onOpenChange={o => { if (o && !user) { setAuthOpen(true); return; } setOpen(o); }}>
    <DialogTrigger asChild><Button variant="ghost" size="sm" aria-label="Export data"><Download /><span className="hidden xl:inline">Export</span></Button></DialogTrigger>
    <DialogContent>
      <DialogHeader><DialogTitle>Export map data</DialogTitle><DialogDescription>Download what's loaded for the current region as a spreadsheet (CSV) or a map file (GeoJSON). Each source keeps its own licence.</DialogDescription></DialogHeader>
      <ul className="divide-y text-sm">{sets.map(s => <li key={s.id} className="flex items-center justify-between gap-2 py-3"><span>{s.label} <span className="text-muted-foreground">· {s.rows.length.toLocaleString("en-GB")}</span></span><span className="flex gap-1"><Button size="sm" variant="outline" disabled={!s.rows.length} onClick={() => save(`venaqua-${s.id}.csv`, toCsv(s.rows), "text/csv")}>CSV</Button><Button size="sm" variant="outline" disabled={!s.rows.length} onClick={() => save(`venaqua-${s.id}.geojson`, toGeoJson(s.rows), "application/geo+json")}>GeoJSON</Button></span></li>)}</ul>
    </DialogContent>
  </Dialog>;
}
