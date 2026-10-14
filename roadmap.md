# Roadmap — iteration 3 (clarity + five questions)
## Website wording cleanup
- [x] Remove long dashes from visible copy and make sentences natural; preserve facts, prices and logic; browser-verified six public pages with no page errors

- [x] A1 question bar + mode presets
- [x] A2 answer-first cards, collapsible details
- [x] A3/A4 plain words, quality labels
- [x] A5 verdict + "What if…"
- [x] Q4 region ranking + shared clusters (clusters.ts)
- [x] Q5 future exposure (projection.ts, aqueduct.ts)
- [x] Q1 totals + CSV; Q3 site facts
- [x] A6 first-visit tip, A7 fly-to
- [x] C landscape + known gaps

# Current redesign
- [x] Calm map-first controls, broad search and practical smaller-screen layout
- [x] Opportunity decision workspace with economics, route, evidence and contact
- [x] Private project shortlist, notes, activity and indicative feasibility brief workflow implemented
- [x] Spain-wide EEA treatment plants and existing IED companies; Catalonia overlay preserved; Germany excluded
- [ ] National basin stress, regional tariffs and visible-region-only loading (verified regional files not supplied)
- [x] Browser-checked search, economics, project route, evidence and contact fields; 32 regression tests pass
- [ ] Signed-in saving, notes and download end-to-end check (no auth users; test signup blocked; needs an active account)
- [ ] Document uploads and actual colleague access (not implemented in this pass)
- [x] Provided prompt separating detailed plant/company analysis from the map; not applied

# Discovery / analysis separation
- [x] Compact map preview and separate four-section analysis page
- [x] Preserve camera, filters, selection and company scenario inputs across navigation
- [x] Browser-verified map → analysis → map, retained +50% price scenario, plant evidence and contact; 33 tests pass
- [x] Rename visible app branding, contact drafts, exported briefs and page metadata to Venaqua

# Pitch deck
- [x] Standalone 2-slide .pptx pitch deck delivered to Files (Venaqua-pitch-deck.pptx); in-app deck route removed

## Landing page restore (Edith, Oct 13)
- [x] Faded live map behind the landing hero (backdrop, non-interactive, panels hidden)
- [x] Full landing content from brief v2: hero, Why Venaqua, How it works, For teams, live product proof, trust note, final CTA (Explore map + Talk to the team)
- [x] Banner nav expanded (Platform/Resources dropdowns, Pricing, About us; no Partnerships) + /pricing page built from brief (5 plans, no checkout) — verified in browser, build OK

- [ ] Philip map-fixes plan (What_s_wrong_now): blue rivers, dry-to-wet colour scale, gauge shapes, no-red sector palette, swatch legend, clickable gauges, country-neutral text
- [x] Future water stress (2/5/10/15 yrs) + predicted pipe network layers

## Current stress and freshwater prices
- [x] Add an explicit Now stress surface, separate from hiding the layer
- [x] Add a freshwater price panel with verified INE supply-cost history and clearly assumed stress scenarios; commercial-only history unavailable, use editable current bill price
- [x] Six tests pass; browser verified Now, Hide, graph, scenario toggles and invalid-price validation at 949×693; build OK

## Commercial drought-cost outlook
- [x] Add transparent reuse avoided-cost and investment comparison; 11 tests pass, editable figures and team-contact handoff browser-verified
- [x] Replace purchase-price outlook with restriction-cost scenarios and editable commercial exposure assumptions
- [x] Compare with sourced 2023/2024 Catalan industrial restrictions in Spain, without inventing observed business losses
- [x] Nine tests pass; browser-verified editable totals, graph, scenario toggles, validation, historical cases and close; build OK

## Landing vision and Spain framing
- [x] Frame the landing backdrop on Spain without changing the saved Explorer view
- [x] Clarify wastewater reuse optimization in the headline, subtitle and About us
- [x] Browser-verified Spain backdrop, About us and Explorer-to-home return; no page errors
- [x] Pricing: put most-popular option in the middle

## Pricing product clarity
- [x] Remove internal badge wording, group Deal File / Deal Flow as a solution family, and give each product a distinct enquiry
- [x] Align descriptions with implemented features and distinguish proposed deal-flow automation; pricing, three enquiry prompts and free-map link browser-verified with no runtime errors or smaller-screen overflow

# Deck-aligned map (five modules)
- [x] Module bar 1–5 replacing the dropdown; results panel ranked by €/m³ vs alternative with flip year; two layer chips + More layers; header free-map pill; warm deck palette with orange flip accent
- [x] Site card answers first (route, €/m³ vs alternative, flip year) with locked exports; full analysis page regroup still open
- [x] Landing: five-module section linking into the map, positioning table, harder-to-copy, partners, ambition; pricing export names still open
- [x] Stress strip as one compact expandable chip

# Reuse Pipeline (deal flow)
- [x] /deal-flow: Tenders & Signals with URL filters, table, board, deal detail, CSV; nav, map menu and pricing links; demo-unlocked
- [ ] Investment Cases tab (needs investment_cases.json + cases.ts — not uploaded)
- [ ] Deals on the explore map, near-plant deals on analysis, homepage top-3 deals
- [ ] Block 4 database + plan gating; Block 5 AI review queue

# Pricing simplification (Oct 2026)
- [x] Two paid options only (Investment cases, Data & API); free map as strip below
- [x] Removed all Beta/coming labels site-wide; everything presented as live
