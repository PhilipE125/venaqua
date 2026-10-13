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
- Browser-callable APIs are fetched client-side; no-CORS APIs (TED) go through createServerFn instead of edge functions — keeps the app keyless and backend-free.
- The map component is lazy-loaded behind ClientOnly and sets the MapLibre worker URL explicitly — MapLibre/deck.gl cannot run during SSR and the bundled worker path breaks otherwise.
- Every source's static metadata (publisher, quality, known issues) lives in src/lib/sources/contract.ts and is surfaced via SourceInfo popovers — one place to keep data provenance honest.
- The A/B/C water-option cost model is pure range arithmetic in src/lib/costs.ts with unit tests; UI only feeds it inputs — keeps money logic auditable.
