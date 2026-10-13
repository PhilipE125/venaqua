export type SectorId =
  | "food"
  | "chemicals"
  | "paper"
  | "textiles"
  | "metals"
  | "plastics"
  | "energy"
  | "agriculture"
  | "services"
  | "other";

export const SECTORS: { id: SectorId; label: string; color: [number, number, number] }[] = [
  { id: "food", label: "Food & drink", color: [214, 120, 46] },
  { id: "chemicals", label: "Chemicals", color: [168, 62, 112] },
  { id: "paper", label: "Paper", color: [130, 105, 70] },
  { id: "textiles", label: "Textiles", color: [196, 90, 160] },
  { id: "metals", label: "Metals", color: [90, 100, 120] },
  { id: "plastics", label: "Plastics", color: [220, 170, 40] },
  { id: "energy", label: "Energy", color: [200, 60, 50] },
  { id: "agriculture", label: "Agriculture", color: [90, 150, 70] },
  { id: "services", label: "Services", color: [120, 150, 190] },
  { id: "other", label: "Other", color: [160, 160, 160] },
];

export const sectorById = Object.fromEntries(SECTORS.map((s) => [s.id, s])) as Record<
  SectorId,
  (typeof SECTORS)[number]
>;

// Keyword lookup over the Catalan CCAE description (lowercased, accents stripped).
const RULES: [SectorId, string[]][] = [
  ["food", ["aliment", "carn", "lact", "formatg", "begud", "vi ", "vins", "cervesa", "conserv", "escorxador", "oli", "fruit", "peix", "pa ", "fleca", "sucre", "cava", "embotit", "aigues minerals", "elaboracio de productes"]],
  ["chemicals", ["quimic", "farmac", "pintur", "detergent", "adob", "cosmet", "gas", "petroli"]],
  ["paper", ["paper", "cartro", "arts grafiques", "impressio"]],
  ["textiles", ["textil", "tint", "acabament", "teixit", "fil", "confeccio", "pell", "adob de pells", "cuir"]],
  ["metals", ["metall", "sider", "fos", "galvan", "tractament i revestiment", "maquinaria", "vehicles", "automob"]],
  ["plastics", ["plastic", "cautxu", "goma"]],
  ["energy", ["energia", "electric", "vapor", "termica", "residus", "depuracio", "aigua"]],
  ["agriculture", ["agric", "ramad", "porc", "bestiar", "aviram", "cultiu", "granja", "explotacio"]],
  ["services", ["restaur", "hotel", "camping", "allotjament", "comerc", "serveis", "neteja", "rentat", "bugaderia", "educacio", "sanitat", "hospital", "oficin", "habitatge", "esport", "estacio de servei"]],
];

export function normalize(s: string) {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function sectorFromCcae(ccae: string): SectorId {
  const t = normalize(ccae) + " ";
  for (const [id, kws] of RULES) if (kws.some((k) => t.includes(k))) return id;
  return "other";
}
