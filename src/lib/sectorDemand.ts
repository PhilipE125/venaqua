import type { SectorId } from "./sectors";

// TODO: replace with sector benchmarks. These are PLACEHOLDER ESTIMATES (m3/day per site),
// not measurements. Users can edit them in the settings dialog.
export const DEFAULT_SECTOR_DEMAND: Record<SectorId, number> = {
  food: 300,
  chemicals: 500,
  paper: 800,
  textiles: 250,
  metals: 200,
  minerals: 150,
  plastics: 120,
  energy: 600,
  agriculture: 150,
  services: 20,
  other: 50,
};
