import { X } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { haversineKm, businessCase, effectiveSupply } from "@/lib/score";
import { eur, fmt, fmt1, useMatches, useMeteo, useRegen, useTenders } from "@/lib/queries";
import { normalize, sectorById } from "@/lib/sectors";
import { useApp } from "@/lib/state";
import type { Company, SupplySite } from "@/lib/types";

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b py-1.5 text-xs">
      <span className="text-muted-foreground">{k}</span>
      <span className="tnum text-right">{v || "–"}</span>
    </div>
  );
}

function Section({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <section className="mt-5">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-medium">{title}</h3>
        {note && <span className="label-caps">{note}</span>}
      </div>
      {children}
    </section>
  );
}

function SiteDetail({ site }: { site: SupplySite }) {
  const { matches, companyById } = useMatches();
  const { settings, maxKm, select } = useApp();
  const tenders = useTenders();
  const meteo = useMeteo(site.lat, site.lon);
  const buyers = useMemo(
    () =>
      matches
        .filter((m) => m.siteId === site.id)
        .sort((a, b) => b.score - a.score)
        .slice(0, 12)
        .map((m) => ({ ...m, company: companyById.get(m.companyId)! })),
    [matches, site.id, companyById],
  );
  const [pick, setPick] = useState<string | null>(null);
  const chosen = buyers.find((b) => b.companyId === pick) ?? buyers[0];
  const bc = chosen
    ? businessCase({
        distanceKm: chosen.distanceKm,
        matchedM3PerDay: chosen.matched,
        pipeCostPerKm: settings.pipeCostPerKm,
        tariff: settings.tariff,
        reclaimedPrice: settings.reclaimedPrice,
      })
    : null;
  const siteTenders = (tenders.data?.tenders ?? []).filter(
    (t) => t.city && normalize(t.city) === normalize(site.municipi),
  );

  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="secondary">{site.kind === "regen" ? "Regeneration plant" : "Treatment plant"}</Badge>
        {site.kind === "regen" && <Badge>Reuse-ready</Badge>}
        {site.kind === "wwtp" && <Badge variant="outline" className="capitalize">{site.level}</Badge>}
        {siteTenders.map((t) => (
          <a key={t.id} href={t.url} target="_blank" rel="noreferrer">
            <Badge variant="outline" className="border-primary text-primary">
              {t.status === "open" ? "Active tender" : t.winner ? `Recently awarded to ${t.winner}` : "Recently awarded"}
            </Badge>
          </a>
        ))}
      </div>
      <Section title="Plant">
        <Row k="Municipality" v={site.municipi} />
        <Row k="Operator" v={site.operator} />
        <Row k="Design capacity" v={`${fmt.format(site.capacity)} m³/day`} />
        {site.kind === "wwtp" ? (
          <>
            <Row k="Population equivalent" v={fmt.format(site.pe)} />
            <Row k="Treatment" v={site.treatment} />
            <Row k="Receiving water" v={site.receiving} />
            <Row k="Data year" v={site.year} />
          </>
        ) : (
          <>
            <Row k="Reused volume" v={`${fmt.format(site.reusedVolume)} m³/year`} />
            <Row k="Data year" v={site.year} />
            <Row k="Location" v={site.geocodedBy === "wwtp" ? "From WWTP in municipality" : "Municipality centroid"} />
          </>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Steps: {(site.kind === "wwtp" ? site.steps : site.treatments).join(" → ") || "–"}
        </p>
      </Section>

      {site.kind === "regen" && (
        <Section title="Reuse by use vs capacity" note="m³/year">
          {(() => {
            const annualCapacity = site.capacity * 365;
            const data = [
              { name: "Agricultural", value: site.reuseByUse.agricultural },
              { name: "Environmental", value: site.reuseByUse.environmental },
              { name: "Urban", value: site.reuseByUse.urban },
              { name: "Recreational", value: site.reuseByUse.recreational },
              { name: "Industrial", value: site.reuseByUse.industrial },
              { name: "Unused capacity", value: Math.max(0, annualCapacity - site.reusedVolume) },
            ].filter((d) => d.value > 0);
            return (
              <>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v) => `${fmt.format(Number(v))} m³/year`} />
                      <Bar dataKey="value" fill="var(--chart-2)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Design capacity × 365 = {fmt.format(annualCapacity)} m³/year; reused {fmt.format(site.reusedVolume)} m³/year.
                </p>
              </>
            );
          })()}
        </Section>
      )}

      <Section title="Nearby buyers" note={`within ${maxKm} km`}>
        {buyers.length === 0 ? (
          <p className="text-xs text-muted-foreground">No companies within the distance limit.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="pb-1 font-normal">Company</th>
                <th className="pb-1 text-right font-normal">km</th>
                <th className="pb-1 text-right font-normal">Score</th>
              </tr>
            </thead>
            <tbody>
              {buyers.map((b) => (
                <tr
                  key={b.companyId}
                  onClick={() => setPick(b.companyId)}
                  className={`cursor-pointer border-t hover:bg-accent ${chosen?.companyId === b.companyId ? "bg-accent" : ""}`}
                >
                  <td className="max-w-[200px] truncate py-1.5 pr-2">
                    <span
                      className="mr-1.5 inline-block h-2 w-2 rounded-full"
                      style={{ background: `rgb(${sectorById[b.company.sector].color.join(",")})` }}
                    />
                    {b.company.name}
                  </td>
                  <td className="tnum py-1.5 text-right">{fmt1.format(b.distanceKm)}</td>
                  <td className="tnum py-1.5 text-right">{fmt.format(b.score)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {chosen && bc && (
        <Section title="Business case" note="indicative">
          <p className="mb-2 text-xs text-muted-foreground">
            With <button className="underline" onClick={() => select({ kind: "company", id: chosen.companyId })}>{chosen.company.name}</button>
          </p>
          <Row k="Matched volume (estimate)" v={`${fmt.format(chosen.matched)} m³/day`} />
          <Row k="Pipe cost" v={eur.format(bc.pipeCost)} />
          <Row k="Annual savings" v={eur.format(bc.annualSavings)} />
          <Row k="Simple payback" v={bc.paybackYears != null ? `${fmt1.format(bc.paybackYears)} years` : "–"} />
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Tariff {settings.tariff.toFixed(2)} €/m³, reclaimed {settings.reclaimedPrice.toFixed(2)} €/m³, pipe {eur.format(settings.pipeCostPerKm)}/km. Edit in settings.
          </p>
        </Section>
      )}

      <Section title="Local water demand pressure" note="modelled">
        {meteo.isLoading ? (
          <Skeleton className="h-28 w-full" />
        ) : meteo.isError || !meteo.data ? (
          <p className="text-xs text-destructive">Open-Meteo unavailable.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div><p className="label-caps">ET0 30d</p><p className="tnum text-base">{fmt.format(meteo.data.et0)} mm</p></div>
              <div><p className="label-caps">Rain 30d</p><p className="tnum text-base">{fmt.format(meteo.data.rain)} mm</p></div>
              <div><p className="label-caps">Deficit</p><p className="tnum text-base">{fmt.format(meteo.data.deficit)} mm</p></div>
            </div>
            <div className="mt-2 h-20">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={meteo.data.days} barGap={0}>
                  <XAxis dataKey="date" hide />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="et0" name="ET0 mm" fill="var(--chart-3)" />
                  <Bar dataKey="rain" name="Rain mm" fill="var(--chart-1)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </Section>
    </>
  );
}

function CompanyDetail({ company }: { company: Company }) {
  const { settings, select } = useApp();
  const regen = useRegen();
  const nearest = useMemo(
    () =>
      (regen.data?.features ?? [])
        .map((p) => ({ p, d: haversineKm(company, p) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 3),
    [regen.data, company],
  );
  const demand = settings.sectorDemand[company.sector];
  return (
    <>
      <Badge variant="secondary">{sectorById[company.sector].label}</Badge>
      <Section title="Company">
        <Row k="Municipality" v={company.municipi} />
        <Row k="Sector (CCAE)" v={company.ccae} />
        <Row k="Discharge type" v={`${company.tipus} · ${company.subtipus}`} />
        <p className="mt-2 text-xs text-muted-foreground first-letter:uppercase">{company.activity}</p>
      </Section>
      <Section title="Water demand" note="estimate">
        <p className="tnum text-2xl">{fmt.format(demand)} <span className="text-sm text-muted-foreground">m³/day</span></p>
        <p className="mt-1 text-xs text-muted-foreground">Sector placeholder, not measured. Edit in settings.</p>
      </Section>
      <Section title="Nearest reuse-ready plants">
        {regen.isLoading ? <Skeleton className="h-20 w-full" /> : (
          <ul className="space-y-1">
            {nearest.map(({ p, d }) => (
              <li key={p.id}>
                <button onClick={() => select({ kind: "regen", id: p.id })} className="flex w-full justify-between rounded-sm px-2 py-1.5 text-left text-xs hover:bg-accent">
                  <span>{p.name}<span className="ml-1.5 text-muted-foreground">{fmt.format(effectiveSupply(p.capacity, false))} m³/day</span></span>
                  <span className="tnum">{fmt1.format(d)} km</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}

export function Drawer() {
  const { selection, select } = useApp();
  const { siteById, companyById } = useMatches();
  if (!selection) return null;
  const site = selection.kind !== "company" ? siteById.get(selection.id) : undefined;
  const company = selection.kind === "company" ? companyById.get(selection.id) : undefined;
  const name = site?.name ?? company?.name;
  if (!name) return null;
  return (
    <aside className="panel absolute right-3 top-3 bottom-3 z-20 flex w-[400px] flex-col rounded-md shadow-xl animate-in slide-in-from-right-4 fade-in">
      <div className="flex items-start justify-between gap-2 border-b px-5 py-4">
        <h2 className="text-base font-semibold leading-snug">{name}</h2>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => select(null)} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-5 pb-6 pt-4">
          {site && <SiteDetail site={site} />}
          {company && <CompanyDetail company={company} />}
        </div>
      </div>
    </aside>
  );
}
