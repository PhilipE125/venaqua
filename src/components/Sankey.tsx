import { sankey, sankeyLinkHorizontal, type SankeyLink, type SankeyNode } from "d3-sankey";
import { useMemo } from "react";
import { fmt } from "@/lib/queries";

export interface Flow {
  target: string;
  value: number; // m3/year
  modelled?: boolean;
  accent?: boolean;
}

type N = { name: string };
type L = { source: number; target: number; value: number; modelled?: boolean | undefined; accent?: boolean | undefined };

/** Single-source sankey: one inflow split into named outflows. Modelled bands are dashed. */
export function Sankey({ source, flows, height = 170 }: { source: string; flows: Flow[]; height?: number }) {
  const width = 360;
  const graph = useMemo(() => {
    const fl = flows.filter((f) => f.value > 0);
    if (!fl.length) return null;
    const nodes: N[] = [{ name: source }, ...fl.map((f) => ({ name: f.target }))];
    const links: L[] = fl.map((f, i) => ({ source: 0, target: i + 1, value: f.value, modelled: f.modelled, accent: f.accent }));
    return sankey<N, L>()
      .nodeWidth(8)
      .nodePadding(8)
      .extent([
        [0, 4],
        [width - 120, height - 4],
      ])({ nodes: nodes.map((d) => ({ ...d })), links: links.map((d) => ({ ...d })) });
  }, [source, flows, height]);
  if (!graph) return <p className="text-xs text-muted-foreground">No flow data.</p>;
  const path = sankeyLinkHorizontal();
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={`Where ${source} water goes`}>
      {graph.links.map((l: SankeyLink<N, L>, i) => (
        <path
          key={i}
          d={path(l) ?? ""}
          fill="none"
          stroke={l.accent ? "var(--primary)" : "var(--foreground)"}
          strokeOpacity={l.accent ? 0.55 : 0.14 + 0.06 * (i % 3)}
          strokeWidth={Math.max(1, l.width ?? 1)}
          strokeDasharray={l.modelled ? "4 3" : undefined}
        >
          <title>{`${(l.target as SankeyNode<N, L>).name}: ${fmt.format(l.value)} m³/yr`}</title>
        </path>
      ))}
      {graph.nodes.map((n, i) => (
        <g key={i}>
          <rect x={n.x0} y={n.y0} width={(n.x1 ?? 0) - (n.x0 ?? 0)} height={Math.max(1, (n.y1 ?? 0) - (n.y0 ?? 0))} fill="var(--foreground)" />
          {i > 0 && (
            <text x={(n.x1 ?? 0) + 6} y={((n.y0 ?? 0) + (n.y1 ?? 0)) / 2} dy="0.35em" fontSize={10} fill="var(--foreground)">
              {n.name} <tspan fill="var(--muted-foreground)" className="tnum">{fmt.format((n.value ?? 0) / 1000)}k</tspan>
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
