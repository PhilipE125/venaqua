"""Build src/data/de-waterways.json: federal waterways split by their nearest PEGELONLINE gauge.

Usage: python3 scripts/de-waterways.py stations.json overpass-ways.json > src/data/de-waterways.json
  stations.json: https://www.pegelonline.wsv.de/webservices/rest-api/v2/stations.json
  overpass-ways.json: way(area.DE)[waterway~"^(river|canal)$"][name~"<gauged waters>"]; out tags geom;
Geometry is static; the colour (low/normal/high) is applied live in the app from the gauge's uuid.
"""
import json, math, re, sys

MAX_KM = 60  # sections further than this from any gauge on the same water are dropped
TOL = 0.002  # Douglas-Peucker tolerance in degrees (~150-200 m)


def norm(t):
    t = t.lower().replace("ß", "ss").replace("ä", "ae").replace("ö", "oe").replace("ü", "ue")
    return re.sub(r"[^a-z]", "", re.sub(r"wasserstrasse|gewaesser", "", t))


def same_water(way_name, water):
    parts = [norm(p) for p in re.split(r" / |\(|\)", way_name) if norm(p)]
    return any(p == water or (len(p) >= 4 and p in water) for p in parts)


def km(a, b):
    dx = (a[0] - b[0]) * math.cos(math.radians((a[1] + b[1]) / 2))
    return 111.2 * math.hypot(dx, a[1] - b[1])


def seg_dist(p, a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    t = 0 if dx == dy == 0 else max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)))
    return math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy)


def simplify(pts):
    if len(pts) < 3:
        return pts
    i, d = max(((i, seg_dist(pts[i], pts[0], pts[-1])) for i in range(1, len(pts) - 1)), key=lambda x: x[1])
    return simplify(pts[: i + 1])[:-1] + simplify(pts[i:]) if d > TOL else [pts[0], pts[-1]]


gauges = [
    (s["uuid"], norm(s["water"]["longname"]), (s["longitude"], s["latitude"]))
    for s in json.load(open(sys.argv[1]))
    if s.get("latitude") and s.get("water")
]
out = {}
for w in json.load(open(sys.argv[2]))["elements"]:
    pts = [(g["lon"], g["lat"]) for g in w["geometry"]]
    mid = pts[len(pts) // 2]
    near = [(km(mid, p), u) for u, water, p in gauges if same_water(w["tags"]["name"], water)]
    if not near or min(near)[0] > MAX_KM:
        continue
    out.setdefault(min(near)[1], []).append([[round(x, 4), round(y, 4)] for x, y in simplify(pts)])
json.dump(out, sys.stdout, separators=(",", ":"))
