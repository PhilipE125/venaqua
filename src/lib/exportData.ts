export type ExportRow = { id: string; name: string; lat: number; lon: number } & Record<string, string | number>;

const cell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(rows: ExportRow[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]!);
  return [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n");
}

export function toGeoJson(rows: ExportRow[]): string {
  return JSON.stringify({
    type: "FeatureCollection",
    features: rows.map(({ lat, lon, ...props }) => ({ type: "Feature", geometry: { type: "Point", coordinates: [lon, lat] }, properties: props })),
  });
}
