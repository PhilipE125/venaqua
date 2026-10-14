export type SiteRow = { name: string; kind: "demand" | "supply"; lat: number; lon: number; volume_m3_day: number; notes: string };

function splitLine(line: string): string[] {
  const out: string[] = []; let cur = ""; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (ch === "," && !q) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/** Parses a user CSV of private sites. Pure; invalid rows are reported, not inserted. */
export function parseSitesCsv(text: string): { rows: SiteRow[]; errors: string[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { rows: [], errors: ["The file is empty"] };
  const head = splitLine(lines[0]!).map((h) => h.toLowerCase());
  const idx = (k: string) => head.indexOf(k);
  const missing = ["name", "kind", "lat", "lon"].filter((k) => idx(k) < 0);
  if (missing.length) return { rows: [], errors: [`Missing columns: ${missing.join(", ")}`] };
  const rows: SiteRow[] = []; const errors: string[] = [];
  lines.slice(1, 1001).forEach((line, n) => {
    const c = splitLine(line);
    const name = (c[idx("name")] ?? "").slice(0, 200);
    const kind = (c[idx("kind")] ?? "").toLowerCase();
    const lat = Number(c[idx("lat")]); const lon = Number(c[idx("lon")]);
    const vol = idx("volume_m3_day") >= 0 ? Number(c[idx("volume_m3_day")] || 0) : 0;
    const notes = idx("notes") >= 0 ? (c[idx("notes")] ?? "").slice(0, 2000) : "";
    if (!name) errors.push(`Row ${n + 2}: name is required`);
    else if (kind !== "demand" && kind !== "supply") errors.push(`Row ${n + 2}: kind must be demand or supply`);
    else if (!(lat >= -90 && lat <= 90) || !(lon >= -180 && lon <= 180)) errors.push(`Row ${n + 2}: invalid coordinates`);
    else if (!(vol >= 0)) errors.push(`Row ${n + 2}: invalid volume`);
    else rows.push({ name, kind, lat, lon, volume_m3_day: vol, notes });
  });
  return { rows, errors };
}
