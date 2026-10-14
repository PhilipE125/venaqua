// Indicative, Spain-wide future water-stress surface rendered as a smooth high-resolution raster.
// Visual scenario only — a smooth field shaped by broad aridity gradients, not an official forecast.
export const STRESS_BOUNDS: [number, number, number, number] = [-9.8, 35.7, 4.6, 44.0];

// Simplified outlines: mainland Spain and the Balearic Islands, [lon, lat].
const MAINLAND: [number, number][] = [
  [-8.88, 41.87], [-8.2, 42.1], [-7.9, 41.85], [-6.6, 41.95], [-6.2, 41.6], [-6.9, 41.0], [-6.8, 40.25], [-7.0, 39.67],
  [-7.53, 39.66], [-7.0, 39.1], [-7.33, 38.43], [-6.95, 38.2], [-7.45, 37.55], [-7.4, 37.18], [-6.9, 37.1], [-6.35, 36.8],
  [-6.2, 36.38], [-5.6, 36.0], [-5.35, 36.15], [-4.6, 36.5], [-4.0, 36.73], [-3.1, 36.75], [-2.4, 36.83], [-2.0, 36.75],
  [-1.65, 37.35], [-0.75, 37.6], [-0.65, 38.1], [-0.1, 38.7], [0.2, 38.75], [-0.3, 39.4], [0.05, 40.0], [0.7, 40.7],
  [1.0, 41.05], [2.1, 41.25], [3.2, 41.85], [3.2, 42.35], [2.6, 42.4], [1.7, 42.5], [0.7, 42.85], [-0.3, 42.85],
  [-1.4, 43.05], [-1.8, 43.38], [-2.9, 43.45], [-3.8, 43.48], [-4.6, 43.4], [-5.8, 43.6], [-7.0, 43.56], [-7.9, 43.78],
  [-8.3, 43.55], [-9.3, 43.2], [-9.1, 42.6], [-8.9, 42.2],
];
const MALLORCA: [number, number][] = [[2.35, 39.6], [2.7, 39.95], [3.2, 39.95], [3.48, 39.7], [3.25, 39.35], [2.75, 39.4]];
const MENORCA: [number, number][] = [[3.8, 40.0], [4.1, 40.08], [4.33, 39.85], [3.85, 39.92]];
const IBIZA: [number, number][] = [[1.2, 38.9], [1.35, 39.1], [1.6, 39.05], [1.55, 38.85]];
export const SPAIN_SHAPES = [MAINLAND, MALLORCA, MENORCA, IBIZA];

const YEARS: Record<string, number> = { "2028": 2, "2031": 5, "2036": 10, "2041": 15 };

// Smooth value in ~0–100 for a location and years ahead.
export function stressAt(lon: number, lat: number, ahead: number): number {
  // Drier to the south-east (Murcia, Almería, Valencia coast), wetter in the green north.
  const south = (43.8 - lat) / 8;
  const east = (lon + 9.5) / 14;
  let v = 30 + south * 42 + east * 14 - Math.max(0, lat - 42.6) * 30;
  // Hotspots: Segura basin, Guadalquivir valley, Ebro valley, Mancha aquifers.
  const spot = (x: number, y: number, r: number, s: number) => s * Math.exp(-((lon - x) ** 2 + (lat - y) ** 2) / (r * r));
  v += spot(-1.3, 37.9, 1.1, 18) + spot(-4.8, 37.6, 1.2, 10) + spot(-0.9, 41.5, 0.9, 9) + spot(-3.0, 39.2, 1.0, 8) + spot(2.1, 41.5, 0.5, 6);
  // Fine natural texture (terrain/aquifer variation) for a high-resolution feel.
  v += 4 * Math.sin(lon * 3.1 + lat * 1.7) * Math.cos(lat * 2.9 - lon * 0.8) + 2.2 * Math.sin(lon * 9.3 - lat * 7.1) + 1.2 * Math.cos(lon * 17 + lat * 13);
  // Stress grows with horizon, faster in already-stressed areas.
  v += ahead * (0.9 + Math.max(0, v - 45) * 0.02);
  return Math.max(0, Math.min(100, v));
}

const cache = new Map<string, string>();
const merc = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const invMerc = (y: number) => (360 / Math.PI) * Math.atan(Math.exp(y)) - 90;

/** PNG data URL for the given scenario year, clipped to Spain. Browser only. */
export function stressImage(year: string, color: (v: number) => [number, number, number]): string {
  const hit = cache.get(year);
  if (hit) return hit;
  const [w0, s0, e0, n0] = STRESS_BOUNDS;
  const W = 1440, H = 1080;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d")!;
  const img = ctx.createImageData(W, H);
  const ahead = YEARS[year] ?? 0;
  const yTop = merc(n0), yBot = merc(s0);
  for (let j = 0; j < H; j++) {
    const lat = invMerc(yTop + ((yBot - yTop) * (j + 0.5)) / H);
    for (let i = 0; i < W; i++) {
      const lon = w0 + ((e0 - w0) * (i + 0.5)) / W;
      const [r, g, b] = color(stressAt(lon, lat, ahead));
      const k = (j * W + i) * 4;
      img.data[k] = r; img.data[k + 1] = g; img.data[k + 2] = b; img.data[k + 3] = 255;
    }
  }
  // Draw the field to a buffer, then clip to Spain with a soft edge.
  const buf = document.createElement("canvas");
  buf.width = W; buf.height = H;
  buf.getContext("2d")!.putImageData(img, 0, 0);
  const toPx = ([lon, lat]: [number, number]) => [((lon - w0) / (e0 - w0)) * W, ((yTop - merc(lat)) / (yTop - yBot)) * H] as const;
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.beginPath();
  for (const shape of SPAIN_SHAPES) shape.forEach((p, i) => { const [x, y] = toPx(p); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
  ctx.closePath();
  ctx.clip();
  ctx.filter = "blur(1.5px)";
  ctx.drawImage(buf, 0, 0);
  ctx.restore();
  const url = cv.toDataURL("image/png");
  cache.set(year, url);
  return url;
}
