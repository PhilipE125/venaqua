export type SectorId =
  | "food"
  | "chemicals"
  | "paper"
  | "textiles"
  | "metals"
  | "minerals"
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
  { id: "minerals", label: "Minerals & ceramics", color: [150, 120, 100] },
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
  ["minerals", ["ceramic", "ciment", "vidre", "rajol", "formigo", "pedra", "minerals no metal"]],
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

/** Municipality name key: no accents, articles or punctuation ("Armentera, l'" → "armentera"). */
export function muniKey(s: string) {
  return normalize(s)
    .replace(/[(),'’.-]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !["el", "la", "els", "les", "l", "lo", "los", "las", "de", "d"].includes(w))
    .join(" ");
}

export function sectorFromCcae(ccae: string): SectorId {
  const t = normalize(ccae) + " ";
  for (const [id, kws] of RULES) if (kws.some((k) => t.includes(k))) return id;
  return "other";
}

/**
 * EEA IED / E-PRTR Annex I activity code → sector. Returns null for activities to exclude
 * (5(*) waste and wastewater, e.g. 5(f) urban WWTPs and 5(d) landfills).
 */
export function sectorFromIedActivity(code: string): SectorId | null {
  const c = (code ?? "").trim().toLowerCase();
  if (c.startsWith("5(")) return null;
  if (c.startsWith("1(")) return "energy";
  if (c.startsWith("2(")) return "metals";
  if (c.startsWith("3(")) return "minerals";
  if (c.startsWith("4(")) return "chemicals";
  if (c.startsWith("6(a)") || c.startsWith("6(b)")) return "paper";
  if (c.startsWith("7(a)")) return "agriculture";
  if (c.startsWith("7(")) return "food";
  if (c.startsWith("8(")) return "food";
  if (c.startsWith("6(")) return "other";
  return "other";
}
