const BASE = "https://analisi.transparenciacatalunya.cat/resource";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = any;
export async function socrata<T = Row>(
  id: string,
  params: Record<string, string> = {},
): Promise<T[]> {
  const out: T[] = [];
  let offset = 0;
  for (;;) {
    const q = new URLSearchParams({ $limit: "5000", $offset: String(offset), ...params });
    const r = await fetch(`${BASE}/${id}.json?${q}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const rows = (await r.json()) as T[];
    out.push(...rows);
    if (rows.length < 5000) break;
    offset += 5000;
  }
  return out;
}

export const datasetUrl = (id: string) => `https://analisi.transparenciacatalunya.cat/d/${id}`;
export const num = (v: unknown) => {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
