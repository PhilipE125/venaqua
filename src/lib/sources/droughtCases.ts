/** Documented restriction episodes, not measured business losses or nationwide rules. */
export const SPANISH_DROUGHT_CASES = [
  {
    id: "catalonia2023",
    name: "Catalonia · exceptional drought",
    period: "March 2023",
    area: "Ter-Llobregat and Fluvià Muga systems",
    industrialCut: 0.15,
    note: "15% industrial water-use reduction. Measures announced 28 February 2023; application depended on the declared supply unit.",
    url: "https://govern.cat/salapremsa/notes-premsa/486602/govern-aborda-lentrada-fase-dexcepcionalitat-del-sistema-ter-llobregat-laquifer-del-fluvia-muga",
  },
  {
    id: "catalonia2024",
    name: "Catalonia · emergency drought",
    period: "February 2024",
    area: "Ter-Llobregat system, including Barcelona and Girona",
    industrialCut: 0.25,
    note: "25% industrial water-use reduction. Emergency announced 1 February 2024. Available reclaimed water could supplement allocations; ACA-approved savings plans could reduce the required cut.",
    url: "https://exteriors.gencat.cat/en/ambits-dactuacio/afers_exteriors/delegacions_govern/ue/actualitat/not_240201_drought_emergency",
  },
] as const;