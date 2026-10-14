// Indicative "predicted" pipe network: a visual sketch inferred from visible infrastructure
// (treatment plants and water-using sites). Not an as-built utility map.
export type Pt = { id: string; lon: number; lat: number };
export type PipeSeg = { path: [number, number][]; kind: "trunk" | "branch"; rural: boolean };

const KM_LAT = 111;
const km = (a: Pt, b: Pt) => {
  const kx = KM_LAT * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180));
  return Math.hypot((a.lon - b.lon) * kx, (a.lat - b.lat) * KM_LAT);
};

// Pipes follow roads, so draw a gentle two-leg route instead of a straight line.
function route(a: Pt, b: Pt): [number, number][] {
  const mid: [number, number] = Math.abs(a.lon - b.lon) > Math.abs(a.lat - b.lat) ? [b.lon, a.lat] : [a.lon, b.lat];
  const m: [number, number] = [(mid[0] * 2 + (a.lon + b.lon) / 2) / 3, (mid[1] * 2 + (a.lat + b.lat) / 2) / 3];
  return [[a.lon, a.lat], m, [b.lon, b.lat]];
}

export function predictPipes(
  plants: (Pt & { capacity: number })[],
  sites: Pt[],
  opts = { branchKm: 12, trunkKm: 22, perPlant: 8, ruralCapacity: 5000 },
): PipeSeg[] {
  const cell = 0.15;
  const grid = new Map<string, Pt[]>();
  for (const s of sites) {
    const k = `${Math.floor(s.lon / cell)}:${Math.floor(s.lat / cell)}`;
    (grid.get(k) ?? grid.set(k, []).get(k)!).push(s);
  }
  const near = (p: Pt) => {
    const cx = Math.floor(p.lon / cell), cy = Math.floor(p.lat / cell);
    const out: Pt[] = [];
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) out.push(...(grid.get(`${cx + dx}:${cy + dy}`) ?? []));
    return out;
  };
  const segs: PipeSeg[] = [];
  for (const p of plants) {
    const rural = p.capacity < opts.ruralCapacity;
    const cand = near(p).map((s) => ({ s, d: km(p, s) })).filter((x) => x.d <= opts.branchKm).sort((a, b) => a.d - b.d).slice(0, opts.perPlant);
    // Prim's tree rooted at the plant, so branches chain from site to site like a real network.
    const tree: Pt[] = [p];
    const left = cand.map((c) => c.s);
    while (left.length) {
      let bi = 0, bt: Pt = p, bd = Infinity;
      left.forEach((s, i) => tree.forEach((t) => { const d = km(s, t); if (d < bd) { bd = d; bi = i; bt = t; } }));
      const s = left.splice(bi, 1)[0]!;
      segs.push({ path: route(bt, s), kind: "branch", rural });
      tree.push(s);
    }
  }
  // Trunk lines: each plant to its nearest neighbouring plant.
  const seen = new Set<string>();
  for (const p of plants) {
    let best: (typeof plants)[number] | undefined, bd = Infinity;
    for (const q of plants) { if (q === p) continue; const d = km(p, q); if (d < bd) { bd = d; best = q; } }
    if (!best || bd > opts.trunkKm) continue;
    const key = [p.id, best.id].sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    segs.push({ path: route(p, best), kind: "trunk", rural: p.capacity < opts.ruralCapacity || best.capacity < opts.ruralCapacity });
  }
  return segs;
}
