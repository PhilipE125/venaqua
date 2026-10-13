import { ArrowRight, Circle, FileCheck2, ShieldCheck } from "lucide-react";
import { PROJECT_STAGES } from "@/lib/project-model";
import { Button } from "@/components/ui/button";

export function ProjectRoute({ onContact }: { onContact: () => void }) {
  return <section className="space-y-6">
    <div><p className="label-caps">Recommended next step</p><h3 className="mt-2 text-xl font-semibold">Turn potential into evidence.</h3><p className="mt-2 text-sm text-muted-foreground">Confirm the available volume and intended water use with both parties before commissioning a route study.</p></div>
    <ol>{PROJECT_STAGES.map((s, i) => <li key={s} className="flex gap-4 border-b py-4"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs tnum">{i + 1}</span><div><p className="text-sm font-medium">{s}</p><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Circle className="h-3 w-3" />Needs validation</p></div></li>)}</ol>
    <div className="space-y-3 text-sm"><p className="flex items-center gap-2 font-medium"><ShieldCheck className="h-4 w-4 text-primary" />Permits & procurement</p><p className="text-muted-foreground">Check the reuse risk-management plan (PGRAR), water-quality requirements, land access and local permits with an engineer. Public buyers may need a tender; private buyers need a supply agreement.</p><p className="text-muted-foreground">Funding eligibility and investment readiness depend on confirmed demand, costs and the responsible authority.</p></div>
    <Button className="w-full" onClick={onContact}><FileCheck2 />Request an engineer-reviewed Deal File<ArrowRight /></Button>
  </section>;
}