<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Data sources live one-per-file in src/lib/sources and return normalised features; scoring stays a pure function in src/lib/score.ts — keeps sources swappable for other EU regions and scoring testable.
- Browser-callable public data APIs are fetched client-side; no-CORS APIs use createServerFn — keeps public-data exploration keyless while Cloud handles private project persistence.
- The map component is lazy-loaded behind ClientOnly and sets the MapLibre worker URL explicitly — MapLibre/deck.gl cannot run during SSR and the bundled worker path breaks otherwise.
- Every source's static metadata (publisher, quality, known issues) lives in src/lib/sources/contract.ts and is surfaced via SourceInfo popovers — one place to keep data provenance honest.
- The A/B/C water-option cost model is pure range arithmetic in src/lib/costs.ts with unit tests; UI only feeds it inputs — keeps money logic auditable.
- Question modes (state `mode` + `MODE_PRESETS` in src/lib/state.tsx) decide which layers and panel a view shows; clusters and future projections are pure modules (clusters.ts, projection.ts) with tests — keeps each question view thin.
- WorkspaceProvider owns shared session, shortlist and enquiry dialog state; project rows are scoped to auth.uid() by RLS — keeps map browsing public and projects private.
- Project briefs export captured opportunity snapshots and explicitly distinguish indicative screening from engineer review — prevents unsupported engineering claims.
- Spain treatment plants normalize EEA records through nationalPlant while joined Catalan records retain their richer overlay — preserves local calculations and source provenance.
- AppStateProvider lives in the root; camera and per-opportunity scenario values stay in this context across map and analysis routes — returning to discovery must not discard user inputs.
- The map renders only a compact opportunity preview; detailed views are reused on the public analysis route — keeps discovery visually separate from project evaluation.
- The shared map's landing presentation frames Spain on load and never writes or follows the Explorer camera or selection — keeps the backdrop stable without losing discovery state.
- Map price history is a sourced supply-only snapshot in its own source module; commercial-price scenarios use pure tested compounding separately from the illustrative stress surface — prevents synthetic map values being presented as calibrated tariff forecasts.
- The map drought-cost outlook uses pure event-exposure arithmetic in droughtCosts.ts and sourced restriction cases in sources/droughtCases.ts; historical monetary replays and future duration sensitivities remain assumptions separate from the synthetic map — avoids implying observed losses or calibrated forecasts.
- Reuse resilience investment comparisons use the same drought event with incremental protected supply and explicit frequency, capital and operating assumptions in droughtCosts.ts — makes avoided-cost and payback claims auditable without implying guaranteed returns.
