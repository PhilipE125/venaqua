// Indicative "predicted" pipe network: a visual sketch inferred from visible infrastructure
// (treatment plants and water-using sites). Not an as-built utility map.
export type Pt = { id: string; lon: number; lat: number };
export type PipeSeg = { path: [number, number][]; kind: "trunk" | "branch"; rural: boolean };

const KM_LAT = 111;
const km = (a: Pt, b: Pt) => {
  const kx = KM_LAT * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180));
  return Math.hypot((a.lon - b.lon) * kx, (a.lat - b.lat) * KM_LAT);
};

// Deterministic pseudo-random in [-1, 1] from coordinates, so routes are stable between renders.
const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
};

// Pipes are laid along roads: build a road-like route with straight runs, 45°/90° turns
// and gentle meanders, then round the corners like a carriageway.
function route(a: Pt, b: Pt): [number, number][] {
  const dx = b.lon - a.lon, dy = b.lat - a.lat;
  const len = Math.hypot(dx, dy) || 1e-9;
  const n = Math.max(4, Math.min(14, Math.round(len / 0.012)));
  const px = -dy / len, py = dx / len;
  const amp = Math.min(0.02, len * 0.12);
  // Octilinear skeleton: run along the dominant axis, then the diagonal, like a road grid.
  const horiz = Math.abs(dx) > Math.abs(dy);
  const straight = horiz ? Math.abs(dx) - Math.abs(dy) : Math.abs(dy) - Math.abs(dx);
  const corner: [number, number] = horiz ? [a.lon + Math.sign(dx) * straight, a.lat] : [a.lon, a.lat + Math.sign(dy) * straight];
  const skel: [number, number][] = [[a.lon, a.lat], corner, [b.lon, b.lat]];
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    // Sample along the skeleton, blended slightly toward the straight line.
    const leg = t < 0.5 ? 0 : 1, lt = t < 0.5 ? t * 2 : (t - 0.5) * 2;
    const s0 = skel[leg]!, s1 = skel[leg + 1]!;
    const sx = s0[0] + (s1[0] - s0[0]) * lt, sy = s0[1] + (s1[1] - s0[1]) * lt;
    const lx = a.lon + dx * t, ly = a.lat + dy * t;
    const w = i === 0 || i === n ? 0 : hash(sx * 50 + i, sy * 50) * amp * Math.sin(Math.PI * t);
    pts.push([sx * 0.7 + lx * 0.3 + px * w, sy * 0.7 + ly * 0.3 + py * w]);
  }
  // Chaikin smoothing (2 passes) for rounded, road-like bends.
  let out = pts;
  for (let k = 0; k < 2; k++) {
    const nx: [number, number][] = [out[0]!];
    for (let i = 0; i < out.length - 1; i++) {
      const p = out[i]!, q = out[i + 1]!;
      nx.push([p[0] * 0.75 + q[0] * 0.25, p[1] * 0.75 + q[1] * 0.25], [p[0] * 0.25 + q[0] * 0.75, p[1] * 0.25 + q[1] * 0.75]);
    }
    nx.push(out[out.length - 1]!);
    out = nx;
  }
  return out;
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
