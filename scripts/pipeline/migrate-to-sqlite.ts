/**
 * One-time migration: loads data/temples.json into data/temples.db.
 * Safe to re-run -- uses UPSERT so existing rows are updated, not duplicated.
 *
 * Run with: npx tsx scripts/pipeline/migrate-to-sqlite.ts
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { initDb, upsertTemple, getTempleCount, closeDb } from "./db.js";
import type { TempleRow } from "./db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface JsonTemple {
  id: string;
  name: string;
  alternateName?: string;
  latitude: number;
  longitude: number;
  yearBuilt: number;
  yearBuiltApproximate: boolean;
  yearBuiltEnd?: number;
  deity?: string;
  religion: string;
  architecturalStyle?: string;
  dynasty?: string;
  commissionedBy?: string;
  material?: string;
  heightMeters?: number;
  heritageStatus?: string;
  partOfComplex?: string;
  description: string;
  history?: string;
  architectureNotes?: string;
  significance?: string;
  floorPlanUrl?: string;
  imageUrl?: string;
  wikipediaUrl?: string;
  wikidataId: string;
  country: string;
  state?: string;
  currentCondition?: string;
}

function toRow(t: JsonTemple): TempleRow {
  return {
    id: t.id,
    name: t.name,
    alternate_name: t.alternateName ?? null,
    latitude: t.latitude,
    longitude: t.longitude,
    year_built: t.yearBuilt ?? null,
    year_built_approximate: t.yearBuiltApproximate ? 1 : 0,
    year_built_end: t.yearBuiltEnd ?? null,
    deity: t.deity ?? null,
    religion: t.religion,
    architectural_style: t.architecturalStyle ?? null,
    dynasty: t.dynasty ?? null,
    commissioned_by: t.commissionedBy ?? null,
    material: t.material ?? null,
    height_meters: t.heightMeters ?? null,
    heritage_status: t.heritageStatus ?? null,
    part_of_complex: t.partOfComplex ?? null,
    description: t.description ?? null,
    history: t.history ?? null,
    architecture_notes: t.architectureNotes ?? null,
    significance: t.significance ?? null,
    image_url: t.imageUrl ?? null,
    floor_plan_url: t.floorPlanUrl ?? null,
    wikipedia_url: t.wikipediaUrl ?? null,
    wikidata_id: t.wikidataId ?? null,
    country: t.country,
    state: t.state ?? null,
    current_condition: t.currentCondition ?? null,
    engineering: null,
    archaeology: null,
    visualization: null,
    graph_tags: null,
    data_sources: null,
    updated_at: new Date().toISOString(),
  };
}

async function main() {
  const jsonPath = join(__dirname, "..", "..", "data", "temples.json");
  const temples: JsonTemple[] = JSON.parse(readFileSync(jsonPath, "utf-8"));

  console.log(`Read ${temples.length} temples from temples.json`);

  const db = initDb();

  const insertMany = db.transaction((rows: TempleRow[]) => {
    for (const row of rows) {
      upsertTemple(db, row);
    }
  });

  const rows = temples.map(toRow);
  insertMany(rows);

  const count = getTempleCount(db);
  console.log(`Migrated ${count} temples to SQLite`);

  if (count !== temples.length) {
    console.error(
      `WARNING: Expected ${temples.length} rows but got ${count}`
    );
    process.exit(1);
  }

  console.log("Migration complete. Database: data/temples.db");
  closeDb();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
