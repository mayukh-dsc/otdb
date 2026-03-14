/**
 * Transform: parse architectureNotes and material fields into structured
 * TempleEngineering JSON. Updates the engineering column for temples
 * that have parseable text data.
 */

import { openDb } from "../db.js";

interface TempleEngineering {
  baseDimensions?: { width: number; depth: number };
  totalArea?: number;
  vimanaHeight?: number;
  vimanaLevels?: number;
  numMandapas?: number;
  numPillars?: number;
  wallThickness?: number;
  orientationDegrees?: number;
  foundationType?: string;
  structuralSystem?: string;
  joinerySystem?: string;
  mortarType?: string;
  constructionMaterials?: string[];
  constructionTechniques?: string[];
  planType?: string;
  superstructureType?: string;
  drainageSystem?: string;
  structuralFeatures?: string[];
  uniqueFeatures?: string[];
}

interface Row {
  id: string;
  architecture_notes: string | null;
  material: string | null;
  height_meters: number | null;
  architectural_style: string | null;
  engineering: string | null;
}

function extractDimensions(text: string): { width: number; depth: number } | undefined {
  // Patterns like "240.9m x 122m", "100 × 50 m", "73m by 36m"
  const m = text.match(
    /(\d+(?:\.\d+)?)\s*m?\s*[x×by]+\s*(\d+(?:\.\d+)?)\s*m/i
  );
  if (m) return { width: parseFloat(m[1]), depth: parseFloat(m[2]) };

  // "240.9 m × 122 m" with m on both sides
  const m2 = text.match(
    /(\d+(?:\.\d+)?)\s*m\s*[x×]\s*(\d+(?:\.\d+)?)\s*m/i
  );
  if (m2) return { width: parseFloat(m2[1]), depth: parseFloat(m2[2]) };

  return undefined;
}

function extractNumber(text: string, patterns: RegExp[]): number | undefined {
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m) return parseFloat(m[1]);
  }
  return undefined;
}

function extractPillars(text: string): number | undefined {
  return extractNumber(text, [
    /(\d+)\s*pillar/i,
    /pillar.*?(\d+)/i,
  ]);
}

function extractMandapas(text: string): number | undefined {
  return extractNumber(text, [/(\d+)\s*mandapa/i]);
}

function extractLevels(text: string): number | undefined {
  return extractNumber(text, [
    /(\d+)\s*(?:tiers?|levels?|stories?|storeys?|talas?)/i,
  ]);
}

function extractMaterials(text: string, materialField: string | null): string[] {
  const materials = new Set<string>();

  if (materialField) {
    materialField
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((m) => materials.add(m));
  }

  const matPatterns: [RegExp, string][] = [
    [/\bgranite\b/i, "Granite"],
    [/\bsandstone\b/i, "Sandstone"],
    [/\blaterite\b/i, "Laterite"],
    [/\bmarble\b/i, "Marble"],
    [/\blimestone\b/i, "Limestone"],
    [/\bbrick\b/i, "Brick"],
    [/\bsoapstone\b/i, "Soapstone"],
    [/\bchlorite schist\b/i, "Soapstone"],
    [/\bgneiss\b/i, "Gneiss"],
    [/\bbasalt\b/i, "Basalt"],
    [/\bstucco\b/i, "Stucco"],
    [/\btuff\b/i, "Volcanic Tuff"],
    [/\bwood\b/i, "Wood"],
  ];

  for (const [pat, name] of matPatterns) {
    if (pat.test(text)) materials.add(name);
  }

  return [...materials];
}

function extractTechniques(text: string): string[] {
  const techniques: string[] = [];
  const pats: [RegExp, string][] = [
    [/\bdry[\s-]?fit\b/i, "Dry-fit"],
    [/\bcorbel/i, "Corbelling"],
    [/\bpost[\s-]and[\s-]lintel\b/i, "Post-and-lintel"],
    [/\btrabeate\b/i, "Post-and-lintel"],
    [/\biron[\s-]?(?:dowel|clamp|pin)/i, "Iron dowels"],
    [/\brock[\s-]?cut\b/i, "Rock-cut"],
    [/\bmonolith/i, "Monolithic"],
    [/\bramp\b/i, "Ramp construction"],
    [/\blime[\s-]?mortar\b/i, "Lime mortar"],
  ];

  for (const [pat, name] of pats) {
    if (pat.test(text)) techniques.push(name);
  }

  return techniques;
}

function extractPlanType(text: string): string | undefined {
  const pats: [RegExp, string][] = [
    [/\bstellate\b/i, "stellate"],
    [/\bstar[\s-]?shaped\b/i, "stellate"],
    [/\bapsidal\b/i, "apsidal"],
    [/\bcrucifor/i, "cruciform"],
    [/\brectangular\b/i, "rectangular"],
    [/\bsquare\b/i, "square"],
    [/\boctagonal\b/i, "octagonal"],
    [/\bcircular\b/i, "circular"],
  ];
  for (const [pat, name] of pats) {
    if (pat.test(text)) return name;
  }
  return undefined;
}

function extractSuperstructure(text: string, style: string | null): string | undefined {
  const pats: [RegExp, string][] = [
    [/\brekha[\s-]?deul\b/i, "Rekha Deul"],
    [/\bphamsana\b/i, "Phamsana"],
    [/\bpidha[\s-]?deul\b/i, "Pidha Deul"],
    [/\bbhumija\b/i, "Bhumija"],
    [/\bsekhari\b/i, "Sekhari"],
    [/\bprasada\b/i, "Prasada"],
    [/\bvimana\b/i, "Vimana"],
    [/\bshikhara\b/i, "Shikhara"],
    [/\bgopura?m\b/i, "Gopuram"],
  ];
  for (const [pat, name] of pats) {
    if (pat.test(text)) return name;
  }
  if (style) {
    if (/dravid/i.test(style)) return "Vimana";
    if (/nagara/i.test(style)) return "Shikhara";
    if (/kalin/i.test(style)) return "Rekha Deul";
  }
  return undefined;
}

function extractStructuralFeatures(text: string): string[] {
  const feats: string[] = [];
  const pats: [RegExp, string][] = [
    [/\btemp(?:le)?\s*tank\b/i, "Temple tank"],
    [/\bpushkarini\b/i, "Temple tank"],
    [/\bmoat\b/i, "Moat"],
    [/\bdrainage\b/i, "Drainage system"],
    [/\bpranala\b/i, "Drainage (pranala)"],
    [/\bmusical\s*pillar/i, "Musical pillars"],
    [/\bgopura?m/i, "Gopuram"],
    [/\bmandapa\b/i, "Mandapa"],
    [/\bprakara\b/i, "Prakara (enclosure)"],
    [/\bcircumambulat/i, "Circumambulatory path"],
    [/\bstep[\s-]?well\b/i, "Step-well"],
    [/\bbaoli\b/i, "Step-well (baoli)"],
    [/\bfrescoe?s?\b/i, "Frescoes"],
    [/\brelief\b/i, "Relief sculptures"],
  ];
  for (const [pat, name] of pats) {
    if (pat.test(text)) feats.push(name);
  }
  return feats;
}

function extractJoinery(text: string): string | undefined {
  if (/\bdry[\s-]?fit\b/i.test(text)) return "dry-fit";
  if (/\biron[\s-]?(?:dowel|clamp)/i.test(text)) return "iron-dowel";
  if (/\blime[\s-]?mortar\b/i.test(text)) return "lime-mortar";
  if (/\binterlock/i.test(text)) return "interlocking";
  return undefined;
}

function extractDrainage(text: string): string | undefined {
  if (/\bpranala\b/i.test(text)) return "Pranala (stone spout drain)";
  if (/\bdrainage\s*channel/i.test(text)) return "Stone drainage channels";
  if (/\bdrainage\s*system/i.test(text)) return "Integrated drainage system";
  if (/\bunderground\s*drain/i.test(text)) return "Underground drainage conduits";
  return undefined;
}

export async function run(): Promise<void> {
  const db = openDb();

  const rows = db
    .prepare(
      "SELECT id, architecture_notes, material, height_meters, architectural_style, engineering FROM temples"
    )
    .all() as Row[];

  const update = db.prepare(
    "UPDATE temples SET engineering = ? WHERE id = ?"
  );

  let updated = 0;

  const batch = db.transaction(() => {
    for (const row of rows) {
      const text = [row.architecture_notes || ""].join(" ");
      if (!text.trim() && !row.material) continue;

      const existing: TempleEngineering = row.engineering
        ? JSON.parse(row.engineering)
        : {};

      const eng: TempleEngineering = { ...existing };

      const dims = extractDimensions(text);
      if (dims && !eng.baseDimensions) eng.baseDimensions = dims;

      const pillars = extractPillars(text);
      if (pillars && !eng.numPillars) eng.numPillars = pillars;

      const mandapas = extractMandapas(text);
      if (mandapas && !eng.numMandapas) eng.numMandapas = mandapas;

      const levels = extractLevels(text);
      if (levels && !eng.vimanaLevels) eng.vimanaLevels = levels;

      if (row.height_meters && !eng.vimanaHeight) {
        eng.vimanaHeight = row.height_meters;
      }

      const materials = extractMaterials(text, row.material);
      if (materials.length > 0 && !eng.constructionMaterials) {
        eng.constructionMaterials = materials;
      }

      const techniques = extractTechniques(text);
      if (techniques.length > 0 && !eng.constructionTechniques) {
        eng.constructionTechniques = techniques;
      }

      const planType = extractPlanType(text);
      if (planType && !eng.planType) eng.planType = planType;

      const superstructure = extractSuperstructure(text, row.architectural_style);
      if (superstructure && !eng.superstructureType) eng.superstructureType = superstructure;

      const structFeats = extractStructuralFeatures(text);
      if (structFeats.length > 0 && !eng.structuralFeatures) {
        eng.structuralFeatures = structFeats;
      }

      const joinery = extractJoinery(text);
      if (joinery && !eng.joinerySystem) eng.joinerySystem = joinery;

      const drainage = extractDrainage(text);
      if (drainage && !eng.drainageSystem) eng.drainageSystem = drainage;

      if (!eng.structuralSystem) {
        if (/\btrabeate\b/i.test(text) || /\bpost[\s-]and[\s-]lintel\b/i.test(text)) {
          eng.structuralSystem = "Post-and-lintel (trabeate)";
        } else if (/\bcorbel/i.test(text)) {
          eng.structuralSystem = "Corbelled";
        }
      }

      if (Object.keys(eng).length > 0) {
        update.run(JSON.stringify(eng), row.id);
        updated++;
      }
    }
  });

  batch();
  console.log(`    Extracted engineering data for ${updated} temples`);
}
