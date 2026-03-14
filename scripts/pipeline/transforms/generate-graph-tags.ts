/**
 * Transform: derive normalized graph tags from temple data for
 * cross-temple similarity discovery and feature iconography.
 *
 * Tag format: "category:value" e.g. "material:granite", "technique:dry-fit"
 */

import { openDb } from "../db.js";

interface Row {
  id: string;
  religion: string;
  architectural_style: string | null;
  material: string | null;
  dynasty: string | null;
  year_built: number | null;
  country: string;
  engineering: string | null;
  current_condition: string | null;
  heritage_status: string | null;
}

interface Engineering {
  constructionMaterials?: string[];
  constructionTechniques?: string[];
  planType?: string;
  superstructureType?: string;
  joinerySystem?: string;
  structuralSystem?: string;
  drainageSystem?: string;
  structuralFeatures?: string[];
  waterFeatures?: { type: string }[];
  acousticProperties?: string;
  astronomicalAlignments?: string[];
  thermalDesign?: string;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getCenturyTag(year: number): string | null {
  if (!year) return null;
  if (year < 0) {
    const century = Math.ceil(Math.abs(year) / 100);
    return `century:${century}-bce`;
  }
  const century = Math.ceil(year / 100);
  return `century:${century}`;
}

function getStyleTags(style: string | null): string[] {
  if (!style) return [];
  const tags: string[] = [];
  const s = style.toLowerCase();

  const styles: [RegExp, string][] = [
    [/\bdravid/i, "dravida"],
    [/\bnagara\b/i, "nagara"],
    [/\bvesara\b/i, "vesara"],
    [/\bkhmer\b/i, "khmer"],
    [/\bkalin/i, "kalinga"],
    [/\bhoysala\b/i, "hoysala"],
    [/\bchola\b/i, "chola"],
    [/\bchaluk/i, "chalukya"],
    [/\bpallav/i, "pallava"],
    [/\bvijayanagar/i, "vijayanagara"],
    [/\bnayak/i, "nayaka"],
    [/\bmughal\b/i, "mughal"],
    [/\bgothic\b/i, "gothic"],
    [/\bpagan\b/i, "pagan"],
    [/\bcham\b/i, "cham"],
  ];

  for (const [pat, val] of styles) {
    if (pat.test(s)) tags.push(`style:${val}`);
  }

  if (tags.length === 0) {
    tags.push(`style:${slugify(style)}`);
  }

  return tags;
}

function getDynastyTag(dynasty: string | null): string | null {
  if (!dynasty) return null;
  return `dynasty:${slugify(dynasty)}`;
}

export async function run(): Promise<void> {
  const db = openDb();

  const rows = db
    .prepare(
      `SELECT id, religion, architectural_style, material, dynasty,
              year_built, country, engineering, current_condition, heritage_status
       FROM temples`
    )
    .all() as Row[];

  const update = db.prepare("UPDATE temples SET graph_tags = ? WHERE id = ?");

  let updated = 0;

  const batch = db.transaction(() => {
    for (const row of rows) {
      const tags = new Set<string>();

      // Religion
      tags.add(`religion:${slugify(row.religion)}`);

      // Country
      tags.add(`country:${slugify(row.country)}`);

      // Style
      for (const t of getStyleTags(row.architectural_style)) {
        tags.add(t);
      }

      // Dynasty
      const dynastyTag = getDynastyTag(row.dynasty);
      if (dynastyTag) tags.add(dynastyTag);

      // Century
      const centuryTag = getCenturyTag(row.year_built ?? 0);
      if (centuryTag) tags.add(centuryTag);

      // Condition
      if (row.current_condition) {
        tags.add(`condition:${slugify(row.current_condition)}`);
      }

      // Heritage
      if (row.heritage_status) {
        if (/unesco/i.test(row.heritage_status)) {
          tags.add("heritage:unesco");
        }
        if (/national/i.test(row.heritage_status)) {
          tags.add("heritage:national");
        }
        if (/asi/i.test(row.heritage_status)) {
          tags.add("heritage:asi-protected");
        }
      }

      // Engineering-derived tags
      if (row.engineering) {
        try {
          const eng: Engineering = JSON.parse(row.engineering);

          if (eng.constructionMaterials) {
            for (const mat of eng.constructionMaterials) {
              tags.add(`material:${slugify(mat)}`);
            }
          }

          if (eng.constructionTechniques) {
            for (const tech of eng.constructionTechniques) {
              tags.add(`technique:${slugify(tech)}`);
            }
          }

          if (eng.planType) {
            tags.add(`plan:${slugify(eng.planType)}`);
          }

          if (eng.superstructureType) {
            tags.add(`feature:${slugify(eng.superstructureType)}`);
          }

          if (eng.joinerySystem) {
            tags.add(`technique:${slugify(eng.joinerySystem)}`);
          }

          if (eng.structuralSystem) {
            tags.add(`technique:${slugify(eng.structuralSystem)}`);
          }

          if (eng.drainageSystem) {
            tags.add("water:drainage");
          }

          if (eng.structuralFeatures) {
            for (const feat of eng.structuralFeatures) {
              const slug = slugify(feat);
              if (slug.includes("tank") || slug.includes("pushkarini")) {
                tags.add("water:temple-tank");
              } else if (slug.includes("moat")) {
                tags.add("water:moat");
              } else if (slug.includes("step-well") || slug.includes("baoli")) {
                tags.add("water:step-well");
              } else if (slug.includes("gopuram")) {
                tags.add("feature:gopuram");
              } else if (slug.includes("mandapa")) {
                tags.add("feature:mandapa");
              } else if (slug.includes("prakara")) {
                tags.add("feature:prakara");
              } else if (slug.includes("musical")) {
                tags.add("environmental:acoustic");
              } else {
                tags.add(`feature:${slug}`);
              }
            }
          }

          if (eng.waterFeatures) {
            for (const wf of eng.waterFeatures) {
              tags.add(`water:${slugify(wf.type)}`);
            }
          }

          if (eng.acousticProperties) {
            tags.add("environmental:acoustic");
          }

          if (eng.astronomicalAlignments && eng.astronomicalAlignments.length > 0) {
            tags.add("environmental:solar-alignment");
          }

          if (eng.thermalDesign) {
            tags.add("environmental:passive-cooling");
          }
        } catch {
          /* skip unparseable engineering */
        }
      }

      // Material field (fallback if engineering didn't have it)
      if (row.material) {
        for (const mat of row.material.split(/[,;]/)) {
          const trimmed = mat.trim();
          if (trimmed) tags.add(`material:${slugify(trimmed)}`);
        }
      }

      const tagArray = [...tags].sort();
      update.run(JSON.stringify(tagArray), row.id);
      updated++;
    }
  });

  batch();
  console.log(`    Generated graph tags for ${updated} temples`);
}
