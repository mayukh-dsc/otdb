/**
 * Export transform: generates data/temples.json from SQLite for open data distribution.
 * Strips internal pipeline fields (data_sources, updated_at).
 */

import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { openDb } from "../db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface RawRow {
  [key: string]: unknown;
}

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

export async function run(): Promise<void> {
  const db = openDb();

  const rows = db
    .prepare(
      `SELECT id, name, alternate_name, latitude, longitude,
              year_built, year_built_approximate, year_built_end,
              deity, religion, architectural_style, dynasty, commissioned_by,
              material, height_meters, heritage_status, part_of_complex,
              description, history, architecture_notes, significance,
              image_url, floor_plan_url, wikipedia_url, wikidata_id,
              country, state, current_condition,
              engineering, archaeology, visualization, graph_tags
       FROM temples ORDER BY name`
    )
    .all() as RawRow[];

  const temples = rows.map((row) => {
    const temple: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      if (value === null) continue;
      const camelKey = snakeToCamel(key);

      if (
        ["engineering", "archaeology", "visualization", "graph_tags"].includes(
          key
        ) &&
        typeof value === "string"
      ) {
        try {
          const parsed = JSON.parse(value);
          if (
            parsed !== null &&
            (typeof parsed === "object" || Array.isArray(parsed))
          ) {
            temple[camelKey === "graphTags" ? "graphTags" : camelKey] = parsed;
          }
        } catch {
          /* skip unparseable JSON */
        }
        continue;
      }

      if (key === "year_built_approximate") {
        temple.yearBuiltApproximate = value === 1;
        continue;
      }

      temple[camelKey] = value;
    }
    return temple;
  });

  const outPath = join(__dirname, "..", "..", "..", "data", "temples.json");
  writeFileSync(outPath, JSON.stringify(temples, null, 2) + "\n");
  console.log(`    Exported ${temples.length} temples to data/temples.json`);
}
