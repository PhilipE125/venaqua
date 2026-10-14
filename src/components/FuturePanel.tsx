import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { droughtRecordLabel, FUTURE_END, FUTURE_START, GROWTH, projectFuture, type FutureInputs } from "@/lib/projection";
import { eurK, fmt1 } from "@/lib/queries";
import { climateFactor } from "@/lib/sources/aqueduct";
import { useApp, useScenarioState } from "@/lib/state";
import { SourceInfo } from "./SourceInfo";

const START = FUTURE_START;
const END = FUTURE_END;

export type { FutureInputs };

export function useFuture(i: FutureInputs, growth: keyof typeof GROWTH) {
  return useMemo(() => projectFuture(i, GROWTH[growth]), [i, growth]);
}

export function FuturePanel({ inputs }: { inputs: FutureInputs }) {
  const { selection } = useApp();
  const [growth, setGrowth] = useScenarioState<keyof typeof GROWTH>(`${selection?.id}:growth`, "mid");
  const [year, setYear] = useScenarioState(`${selection?.id}:futureYear`, 2035);
  const f = useFuture(inputs, growth);
  const row = f.rows.find((r) => r["year"] === year) ?? f.rows.at(-1)!;
  const best = [f.payB, f.payC].filter((x): x is number => x != null).sort((a, b) => a - b)[0];
  const which = best == null ? null : best === f.payC ? "on-site reuse" : "the grid connection";
  return (
    <div>
      <div className="rounded-sm border bg-muted/40 p-3">
        <p className="label-caps flex items-center gap-1.5">Future exposure · projection <SourceInfo id="aqueduct" /></p>
        <p className="tnum mt-1 text-2xl font-medium">{best != null ? `Pays off from ${best}` : `No payback by ${END}`}</p>
        <p className="mt-1 text-sm leading-snug">
          {which ? `With tariffs rising ${GROWTH[growth] * 100}% a year and droughts getting more frequent, ${which} becomes cheaper than doing nothing in ${best}.` : "Under these assumptions reuse stays more expensive than mains water."}
        </p>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="label-caps">Tariff rise per year</span>
        <ToggleGroup type="single" size="sm" variant="outline" value={growth} onValueChange={(v) => v && setGrowth(v as keyof typeof GROWTH)}>
          {(Object.keys(GROWTH) as (keyof typeof GROWTH)[]).map((k) => (
            <ToggleGroupItem key={k} value={k} className="h-7 px-2.5 text-xs">{k} {GROWTH[k] * 100}%</ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div className="mt-3 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={f.rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 10 }} interval={5} />
            <YAxis tick={{ fontSize: 10 }} width={44} tickFormatter={(v) => eurK(Number(v))} />
            <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v) => eurK(Number(v))} />
            <ReferenceLine x={year} stroke="var(--muted-foreground)" strokeDasharray="3 3" />
            <Line type="monotone" dataKey="A" name="A · Status quo" stroke="var(--foreground)" dot={false} strokeWidth={1.5} />
            {inputs.B && <Line type="monotone" dataKey="B" name="B · Grid reuse" stroke="var(--muted-foreground)" dot={false} strokeWidth={1.5} strokeDasharray="5 3" />}
            <Line type="monotone" dataKey="C" name="C · On site" stroke="var(--primary)" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-muted-foreground">Cumulative cost from {START}, including drought losses. Black = status quo, dashed = grid reuse, accent = on site.</p>
      <div className="mt-3 space-y-2">
        <div className="flex justify-between text-xs"><span className="label-caps">Year</span><span className="tnum">{year}</span></div>
        <Slider min={START} max={END} step={1} value={[year]} onValueChange={([v]) => setYear(v ?? 2035)} />
        <div className="tnum grid grid-cols-3 gap-2 text-xs">
          <div><p className="label-caps">A by {year}</p><p>{eurK(row["A"]!)}</p></div>
          <div><p className="label-caps">B by {year}</p><p>{row["B"] != null ? eurK(row["B"]) : "-"}</p></div>
          <div><p className="label-caps">C by {year}</p><p>{eurK(row["C"]!)}</p></div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          In {year}: tariff {fmt1.format(f.tariffFor(year))} €/m³, expected supply cut {fmt1.format(f.cutFor(year) * 100)}% ({droughtRecordLabel(inputs.events)}, × climate factor {fmt1.format(climateFactor(year))}).
        </p>
      </div>
    </div>
  );
}
