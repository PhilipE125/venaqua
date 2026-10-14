import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { SourceInfo } from "./SourceInfo";
import { Skeleton } from "@/components/ui/skeleton";
import { fmt, fmt1, usePrat, useReservoirHistory, useReservoirs, useVigieauDepartments } from "@/lib/queries";
import { GRAVITE_LABEL, GRAVITES } from "@/lib/sources/vigieau";
import { useApp } from "@/lib/state";
import { STRESS_HORIZONS } from "@/lib/stressGrid";
import { WaterPricePanel } from "./map/WaterPricePanel";

function Spark({ data, color }: { data: { date: string; value: number }[]; color: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
        <YAxis hide domain={["dataMin", "dataMax"]} />
        <Tooltip
          contentStyle={{ fontSize: 11, padding: "2px 6px" }}
          labelFormatter={(_, p) => p?.[0]?.payload?.date ?? ""}
          formatter={(v) => fmt1.format(Number(v))}
        />
        <Area type="monotone" dataKey="value" stroke={color} fill={color} fillOpacity={0.12} strokeWidth={1.5} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Germany: no reservoir series; stress is the share of federal river gauges at low water.
function GaugeStrip({ withSelection }: { withSelection: boolean }) {
  const g = useReservoirs();
  const gauges = g.data?.features ?? [];
  const low = gauges.filter((x) => x.note === "low water").length;
  return (
    <div className={`panel map-context pointer-events-auto absolute bottom-4 left-5 z-10 flex h-[76px] items-stretch gap-4 overflow-hidden rounded-lg px-4 py-2.5 shadow-map-panel ${withSelection ? "with-selection" : ""}`}>
      <div className="flex flex-col justify-center">
        <p className="label-caps">Water stress now</p>
        <p className="text-[11px] text-muted-foreground">Germany, federal waterways</p>
      </div>
      <div className="flex min-w-0 items-center gap-3 border-l pl-4">
        <div>
          <p className="text-[11px] text-muted-foreground">River gauges at low water (PEGELONLINE, live)</p>
          {g.isLoading ? <Skeleton className="mt-1 h-6 w-16" /> : g.isError ? <p className="text-xs text-destructive">Unavailable</p> : (
            <p className="tnum text-xl font-medium">
              {gauges.length ? fmt.format((low / gauges.length) * 100) : 0}%
              <span className="ml-1.5 text-xs text-muted-foreground">{fmt.format(low)} of {fmt.format(gauges.length)} gauges</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// France: official drought restrictions (VigiEau), highest level in force per department.
function RestrictionStrip({ withSelection }: { withSelection: boolean }) {
  const d = useVigieauDepartments();
  const deps = d.data ?? [];
  const count = (l: (typeof GRAVITES)[number]) => deps.filter((x) => x.level === l).length;
  return (
    <div className={`panel map-context pointer-events-auto absolute bottom-4 left-5 z-10 flex h-[76px] items-stretch gap-4 overflow-hidden rounded-lg px-4 py-2.5 shadow-map-panel ${withSelection ? "with-selection" : ""}`}>
      <div className="flex flex-col justify-center">
        <p className="label-caps">Water stress now</p>
        <p className="text-[11px] text-muted-foreground">France, drought restrictions</p>
      </div>
      <div className="flex min-w-0 items-center gap-3 border-l pl-4">
        <div>
          <p className="text-[11px] text-muted-foreground">Departments at the highest level, crise (VigiEau, live)</p>
          {d.isLoading ? <Skeleton className="mt-1 h-6 w-16" /> : d.isError ? <p className="text-xs text-destructive">Unavailable</p> : (
            <p className="tnum text-xl font-medium">
              {fmt.format(count("crise"))}<span className="text-sm text-muted-foreground"> of {fmt.format(deps.length)}</span>
              <span className="ml-1.5 text-xs text-muted-foreground">{fmt.format(count("alerte_renforcee"))} {GRAVITE_LABEL.alerte_renforcee.toLowerCase()} · {fmt.format(count("alerte"))} alerte</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function StressStrip() {
  const { selection, region } = useApp();
  if (region === "de") return <GaugeStrip withSelection={!!selection} />;
  if (region === "fr") return <RestrictionStrip withSelection={!!selection} />;
  return <CatalanStrip />;
}

function CatalanStrip() {
  const { selection, region, horizon } = useApp();
  const ahead = STRESS_HORIZONS.find((h) => h.key === horizon)?.ahead ?? 0;
  const res = useReservoirHistory();
  const prat = usePrat();
  const last = res.data?.series.at(-1);
  const first = res.data?.series[0];
  const pratTotal = prat.data?.series.reduce((s, d) => s + d.reuse, 0) ?? 0;
  const pratRiver = prat.data?.series.reduce((s, d) => s + d.river, 0) ?? 0;
  return (
    <div className={`panel map-context pointer-events-auto absolute bottom-4 left-5 z-10 flex h-[76px] items-stretch gap-4 overflow-hidden rounded-lg px-4 py-2.5 shadow-map-panel ${selection ? "with-selection" : ""}`}>
      <div className="flex flex-col justify-center">
        <p className="label-caps">Water stress now</p>
        <p className="text-[11px] text-muted-foreground">{region === "es" ? "Live data: Catalonia only" : "Catalonia, internal basins"}</p>
        <div className="mt-1"><WaterPricePanel horizon={ahead} /></div>
      </div>
      <div className="flex min-w-0 items-center gap-3 border-l pl-4">
        <div>
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">Reservoir fill, volume-weighted <SourceInfo id="reservoirs" date={last?.date} /></p>
          {res.isLoading ? <Skeleton className="mt-1 h-6 w-16" /> : res.isError ? <p className="text-xs text-destructive">Unavailable</p> : (
            <p className="tnum text-xl font-medium">
              {fmt1.format(last?.value ?? 0)}%
              {first && last && (
                <span className="ml-1.5 text-xs text-muted-foreground">{last.value >= first.value ? "+" : ""}{fmt1.format(last.value - first.value)} pt / 90d</span>
              )}
            </p>
          )}
        </div>
        <div className="hidden h-12 w-24 xl:block">{res.data && <Spark data={res.data.series} color="var(--chart-1)" />}</div>
      </div>
      <div className={`hidden items-center gap-3 border-l pl-4 ${selection ? "" : "lg:flex"}`}>
        <div>
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">El Prat pumped for reuse / to river, 30d <SourceInfo id="prat" /></p>
          {prat.isLoading ? <Skeleton className="mt-1 h-6 w-16" /> : prat.isError ? <p className="text-xs text-destructive">Unavailable</p> : (
            <p className="tnum text-xl font-medium">{fmt.format(pratTotal / 1000)}<span className="ml-1 text-xs text-muted-foreground">k m³ reused · {fmt.format(pratRiver / 1000)}k to river</span></p>
          )}
        </div>
        <div className="hidden h-12 w-24 xl:block">
          {prat.data && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={prat.data.series} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
                <Tooltip contentStyle={{ fontSize: 11, padding: "2px 6px" }} labelFormatter={(_, p) => p?.[0]?.payload?.date ?? ""} formatter={(v) => `${fmt.format(Number(v))} m³/day`} />
                <Area type="monotone" dataKey="reuse" name="Reused" stackId="1" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.45} strokeWidth={1.5} />
                <Area type="monotone" dataKey="river" name="To river" stackId="1" stroke="var(--muted-foreground)" fill="var(--muted-foreground)" fillOpacity={0.12} strokeWidth={1} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
