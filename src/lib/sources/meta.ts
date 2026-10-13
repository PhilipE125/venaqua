export type Quality = "measured" | "modelled" | "estimated";

export interface SourceMeta {
  key: string;
  name: string;
  url: string;
  quality: Quality;
  note: string;
  euEquivalent: string;
}

export const SOURCES: SourceMeta[] = [
  { key: "wwtp", name: "Treatment plants (EDAR), ACA", url: "https://analisi.transparenciacatalunya.cat/d/k288-dig3", quality: "measured", note: "Design capacity, population equivalent, treatment train. Latest year per system.", euEquivalent: "EEA WISE UWWTD treatment plants" },
  { key: "regen", name: "Water regeneration plants (ERA), ACA", url: "https://analisi.transparenciacatalunya.cat/d/5bep-wiuf", quality: "measured", note: "No coordinates in source: located via the WWTP in the same municipality, or Nominatim.", euEquivalent: "EEA UWWTD uwwWasteWaterReuse flag" },
  { key: "companies", name: "Authorised dischargers, ACA", url: "https://analisi.transparenciacatalunya.cat/d/rneu-w4f4", quality: "measured", note: "Sector grouped from CCAE by keyword. Water demand per site is estimated.", euEquivalent: "E-PRTR / Industrial Emissions Portal" },
  { key: "reservoirs", name: "Reservoir levels (daily), ACA", url: "https://analisi.transparenciacatalunya.cat/d/gn9e-3qhr", quality: "measured", note: "Internal basins only. Dam coordinates hard-coded.", euEquivalent: "EEA WISE / Copernicus EDO" },
  { key: "prat", name: "El Prat reclaimed water (daily), ACA", url: "https://analisi.transparenciacatalunya.cat/d/3prd-nrah", quality: "measured", note: "Sum of outflows excluding discharge to river, m3/s converted to m3/day.", euEquivalent: "National reuse registers" },
  { key: "meteo", name: "Open-Meteo ET0 and precipitation", url: "https://open-meteo.com", quality: "modelled", note: "Past 30 days, per selected plant.", euEquivalent: "Same API, global" },
  { key: "ted", name: "TED EU tenders", url: "https://ted.europa.eu", quality: "measured", note: "CPV 45252127, 45252100, 45252126, 90513800 in Spain since 2024.", euEquivalent: "Same API, all EU" },
  { key: "demand", name: "Sector water demand", url: "#settings", quality: "estimated", note: "Placeholder values per sector. Editable in settings.", euEquivalent: "To be sourced" },
  { key: "eea", name: "EEA UWWTD treatment plants 2022", url: "https://water.discomap.eea.europa.eu/arcgis/rest/services/WISE_UWWTD/TreatmentPlants_2022/MapServer/0", quality: "measured", note: "Used for the Spain and Europe views (coming soon).", euEquivalent: "EU-wide" },
];
