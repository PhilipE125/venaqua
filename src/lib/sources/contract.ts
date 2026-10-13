// Shared contract every data source follows. Static parts live here; runtime parts
// (fetchedAt, latestDataDate, coverage) come back with each fetch as SourceResult.
export type Quality = "measured" | "modelled" | "assumption";

export interface SourceMeta {
  id: string;
  name: string;
  publisher: string;
  url: string;
  unitNotes: string;
  updateFrequency: string;
  quality: Quality;
  knownIssues?: string[];
  euEquivalent?: string;
}

export interface SourceStatus {
  fetchedAt?: string | undefined;
  latestDataDate?: string | undefined;
  coverage?: { kept: number; fetched: number } | undefined;
}

export const META = {
  wwtp: {
    id: "wwtp",
    name: "Treatment plants (EDAR)",
    publisher: "Agència Catalana de l'Aigua",
    url: "https://analisi.transparenciacatalunya.cat/d/k288-dig3",
    unitNotes: "Design flow cabal_disseny in m³/day; population equivalent.",
    updateFrequency: "Yearly",
    quality: "measured",
    knownIssues: ["Design values, not actual flows", "Catalonia only"],
    euEquivalent: "EEA WISE UWWTD treatment plants",
  },
  eea: {
    id: "eea",
    name: "UWWTD treatment plants 2022",
    publisher: "European Environment Agency",
    url: "https://water.discomap.eea.europa.eu/arcgis/rest/services/WISE_UWWTD/TreatmentPlants_2022/MapServer/0",
    unitNotes: "uwwWasteWaterTreated in m³/year, divided by 365 for m³/day.",
    updateFrequency: "Every 2 years",
    quality: "measured",
    knownIssues: ["EEA volumes are 2022", "EEA reuse field sparse", "Some plants report no treated volume"],
    euEquivalent: "Same source, EU-wide",
  },
  regen: {
    id: "regen",
    name: "Water regeneration plants (ERA)",
    publisher: "Agència Catalana de l'Aigua",
    url: "https://analisi.transparenciacatalunya.cat/d/5bep-wiuf",
    unitNotes: "Reused volume by use in m³/year; design flow m³/day.",
    updateFrequency: "Yearly",
    quality: "measured",
    knownIssues: ["No coordinates: placed at the WWTP in the same municipality, or geocoded", "No buyer names"],
    euEquivalent: "EEA UWWTD reuse flag",
  },
  companies: {
    id: "companies",
    name: "Authorised dischargers",
    publisher: "Agència Catalana de l'Aigua",
    url: "https://analisi.transparenciacatalunya.cat/d/rneu-w4f4",
    unitNotes: "Permit register; no volumes.",
    updateFrequency: "Irregular",
    quality: "measured",
    knownIssues: ["Catalonia only", "Sector grouped from CCAE by keyword", "Holding a permit does not mean buying water"],
    euEquivalent: "EEA Industrial Emissions Portal",
  },
  ied: {
    id: "ied",
    name: "Industrial facilities (IED / E-PRTR)",
    publisher: "European Environment Agency",
    url: "https://discodata.eea.europa.eu",
    unitNotes: "Facility register with Annex I activity code; reporting year 2024.",
    updateFrequency: "Yearly",
    quality: "measured",
    knownIssues: ["Only large installations above IED thresholds", "Water-release flag uses 2023 reports"],
    euEquivalent: "Same source, EU-wide",
  },
  reservoirs: {
    id: "reservoirs",
    name: "Reservoir levels",
    publisher: "Agència Catalana de l'Aigua",
    url: "https://analisi.transparenciacatalunya.cat/d/gn9e-3qhr",
    unitNotes: "Stored volume hm³ and % of capacity; stress is volume-weighted.",
    updateFrequency: "Daily",
    quality: "measured",
    knownIssues: ["Internal basins only", "Dam coordinates hard-coded"],
    euEquivalent: "Copernicus European Drought Observatory",
  },
  prat: {
    id: "prat",
    name: "El Prat regeneration outflows",
    publisher: "Agència Catalana de l'Aigua",
    url: "https://analisi.transparenciacatalunya.cat/d/3prd-nrah",
    unitNotes: "m³/s converted to m³/day. Reuse = Can Solé pumping; rest goes to the river.",
    updateFrequency: "Daily",
    quality: "measured",
    euEquivalent: "National reuse registers",
  },
  drought: {
    id: "drought",
    name: "Drought phase by municipality",
    publisher: "Agència Catalana de l'Aigua",
    url: "https://analisi.transparenciacatalunya.cat/d/i5n8-43cw",
    unitNotes: "Event log of hydrological drought phase changes.",
    updateFrequency: "On change",
    quality: "measured",
    knownIssues: ["Internal basins only; Ebro basin municipalities show as unknown"],
    euEquivalent: "Copernicus EDO combined drought indicator",
  },
  meteo: {
    id: "meteo",
    name: "ET0, precipitation and elevation",
    publisher: "Open-Meteo",
    url: "https://open-meteo.com",
    unitNotes: "mm per day; elevation in m from a 90 m DEM.",
    updateFrequency: "Daily",
    quality: "modelled",
    euEquivalent: "Same API, global",
  },
  ted: {
    id: "ted",
    name: "EU tenders",
    publisher: "Publications Office of the EU (TED)",
    url: "https://ted.europa.eu",
    unitNotes: "CPV 45252127, 45252100, 45252126, 90513800 in Spain since 2024.",
    updateFrequency: "Daily",
    quality: "measured",
    euEquivalent: "Same API, all EU",
  },
  projects: {
    id: "projects",
    name: "Reuse projects (Catalan procurement)",
    publisher: "Generalitat de Catalunya",
    url: "https://analisi.transparenciacatalunya.cat/d/ybgg-dgi6",
    unitNotes: "Contracts whose object mentions reclaimed water; value in € excl. VAT.",
    updateFrequency: "Daily",
    quality: "measured",
    knownIssues: ["Mostly municipalities, not companies", "Located by municipality"],
    euEquivalent: "TED",
  },
  aqueduct: {
    id: "aqueduct",
    name: "Future water stress (Aqueduct 4.0)",
    publisher: "World Resources Institute",
    url: "https://www.wri.org/applications/aqueduct/water-risk-atlas/",
    unitNotes: "Relative change in water stress, 2030 and 2050, business as usual. Used to scale drought frequency.",
    updateFrequency: "Static",
    quality: "modelled",
    knownIssues: ["Rounded basin-level values typed in by hand; verify before use"],
  },
  demand: {
    id: "demand",
    name: "Sector water demand",
    publisher: "Reuse Match",
    url: "#settings",
    unitNotes: "m³/day per site by sector.",
    updateFrequency: "Static",
    quality: "assumption",
    knownIssues: ["Placeholder values; replace with your own figure"],
  },
  costs: {
    id: "costs",
    name: "Cost benchmarks",
    publisher: "Literature (see settings)",
    url: "#settings",
    unitNotes: "Ranges for pipe, polishing, on-site reuse capex/opex, electricity.",
    updateFrequency: "Static",
    quality: "assumption",
    knownIssues: ["Benchmark ranges, not a design"],
  },
} satisfies Record<string, SourceMeta>;

export type SourceId = keyof typeof META;
