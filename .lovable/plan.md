# Make Reuse Match easier to read, and answer all five questions

The landscape research describes five user questions and five things a tool can do: connection map, connection cost, build vs connect, stress projections and shared clusters. Today the app covers questions 2 and 3 well, questions 1 and 4 partly, and question 5 not at all. Shared clusters and stress projections are the gaps where the research finds the fewest existing players. That makes them the place to stand out.

## Part A: Make the interface easier to read

1. **One question at a time.** Turn the four start cards into a permanent row of five question tabs above the map. Picking a question sets the layers, filters and side panel for that question and hides everything else. "Explore everything" keeps today's full view.
2. **The answer first, in plain words.** Every side panel opens with one sentence and one big number, for example: "Yes. EDAR Sils-Vidreres, 13.8 km away, could supply all your water for €1.75–3.08/m³, against €2.72 today." Tables and charts go into "Show the details" sections that start closed.
3. **Fewer map layers on screen.** Each question shows only the layers it needs. The layer list moves into a small "Map layers" menu. The legend shows only what is on screen, with plain labels ("bigger circle = more water treated").
4. **Plain words.** Replace jargon with everyday terms. ERA and EDAR become "Water recycling plant" and "Treatment plant". "Utilisation" becomes "How full the plant runs". Quality badges read "Measured", "Calculated" and "Our estimate", each with a one-line tooltip.
5. **A simpler comparison.** Above the range bars, add a verdict line: "Cheapest: on-site reuse, saves €135k–405k a year". Payback goes into a small table only, never as bare ranges. Scenario controls go under one "What if…" heading.
6. **Guided first visit.** A three-step tip on first load (pick a question, click the map, read the answer). It never shows again after it is dismissed.
7. **Smaller fixes.** Loading text that says what is loading, a "Data from 2022" note next to EU figures, larger text in the side panels, and a fly-to on the map when you pick something from a list.

## Part B: Answer every question in the research

### Q1 Plant operator: "Who within 10 km would buy my reclaimed water, and how much?"
- A plant view that ranks buyers by estimated volume, with each buyer's status shown (potential, water-intensive or confirmed).
- A total line: "Up to X m³/day of demand within 10 km, against Y m³/day you can supply."
- Export the buyer list as a CSV file for outreach.

### Q2 Factory manager: "Is there reuse-ready water near me, and is it cheaper?"
- Already built. Add the plain-language verdict and a "how confident is this" line that counts measured versus estimated inputs.

### Q3 Factory manager, on site: "Build vs connect"
- Already built. Add a short guided form for site facts (water use, discharge volume, effluent type), so results stop relying on sector averages. The answers are labelled "your figure".

### Q4 City or region: "Which reuse links would take the most pressure off the most stressed sources?"
- A new "Region" view that ranks plant-to-company links by water freed from stressed sources. A link counts for more when the buyer's municipality is in a worse drought phase or draws on a low reservoir.
- **Shared clusters (a gap in the research):** find groups of nearby companies that could share one pipe from one plant. Draw them as outlined areas, each with combined demand, shared pipe cost and cost per m³. This reuses the existing pipe cost formula.
- A comarca summary with a flow diagram, stress level and top three links.

### Q5 Factory manager, future stress: "How exposed is my site, and when does reuse pay off?" (new)
- A "Future" panel on each company with a year slider from 2025 to 2050.
- Tariff path: starts at the INE baseline and rises by a yearly rate you can edit, with low, mid and high presets. It is clearly labelled "projection".
- Drought path: how often each drought phase occurs, taken from ACA history (2008–2025), scaled by a climate factor from WRI Aqueduct 2030/2050 stress projections for the basin.
- Output: "Reuse pays off from year X", plus a line chart of cumulative cost for A, B and C over time.

## Part C: Show where we fit in the landscape

- A small "Who else works on this" section on the Data quality tab. It lists the research's player categories per question, so users see where Reuse Match adds value. The list comes from your file, and the file's own note that entries "need verifying" stays visible.
- Move the research notes (no MITECO reuse register, no per-site water use, EEA reuse field is sparse) into "Known gaps" on the Data quality tab.

## Build order

1. Part A, items 1–5 (the biggest gain in clarity)
2. Q4 region ranking and shared clusters
3. Q5 future exposure
4. Q1 additions and CSV export, Q3 site form
5. Part A, items 6–7, and Part C

## Technical details

- Question mode becomes a new `mode` value in app state. A `MODE_PRESETS` map sets which layers are visible, which filters apply and the default side panel.
- New pure modules with unit tests:
  - `src/lib/clusters.ts`: greedy grouping of companies within N km of a common pipe corridor from one plant; combined demand; shared capex = trunk length × pipe cost plus short spurs.
  - `src/lib/projection.ts`: tariff path, drought phase frequencies from the event log scaled by a stress factor, cumulative cost per option, first payback year.
- `src/lib/score.ts` gains a stress-weighted link score: freed volume × (1 + local drought severity). The existing score stays for the Opportunities list.
- New source file `src/lib/sources/aqueduct.ts` for the basin baseline and future stress. It is a small fixed table taken from WRI Aqueduct 4.0 for the Catalan basins, labelled "modelled". It gets an entry in `contract.ts`.
- Landscape players go into `src/lib/landscape.ts` as static data parsed from the uploaded file, labelled "needs verifying".
- CSV export is built in the browser with a Blob download, with no server work.
- No new backend. Everything stays keyless.
