import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "..", "..", "data", "temples.db");
const SCHEMA_PATH = join(__dirname, "schema.sql");

let _db: Database.Database | null = null;

export function openDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  return _db;
}

export function initDb(): Database.Database {
  const db = openDb();
  const schema = readFileSync(SCHEMA_PATH, "utf-8");
  db.exec(schema);
  return db;
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

export interface TempleRow {
  id: string;
  name: string;
  alternate_name: string | null;
  latitude: number;
  longitude: number;
  year_built: number | null;
  year_built_approximate: number;
  year_built_end: number | null;
  deity: string | null;
  religion: string;
  architectural_style: string | null;
  dynasty: string | null;
  commissioned_by: string | null;
  material: string | null;
  height_meters: number | null;
  heritage_status: string | null;
  part_of_complex: string | null;
  description: string | null;
  history: string | null;
  architecture_notes: string | null;
  significance: string | null;
  image_url: string | null;
  floor_plan_url: string | null;
  wikipedia_url: string | null;
  wikidata_id: string | null;
  country: string;
  state: string | null;
  current_condition: string | null;
  engineering: string | null;
  archaeology: string | null;
  visualization: string | null;
  graph_tags: string | null;
  data_sources: string | null;
  updated_at: string | null;
}

const UPSERT_SQL = `
INSERT INTO temples (
  id, name, alternate_name, latitude, longitude,
  year_built, year_built_approximate, year_built_end,
  deity, religion, architectural_style, dynasty, commissioned_by,
  material, height_meters, heritage_status, part_of_complex,
  description, history, architecture_notes, significance,
  image_url, floor_plan_url, wikipedia_url, wikidata_id,
  country, state, current_condition,
  engineering, archaeology, visualization, graph_tags, data_sources,
  updated_at
) VALUES (
  @id, @name, @alternate_name, @latitude, @longitude,
  @year_built, @year_built_approximate, @year_built_end,
  @deity, @religion, @architectural_style, @dynasty, @commissioned_by,
  @material, @height_meters, @heritage_status, @part_of_complex,
  @description, @history, @architecture_notes, @significance,
  @image_url, @floor_plan_url, @wikipedia_url, @wikidata_id,
  @country, @state, @current_condition,
  @engineering, @archaeology, @visualization, @graph_tags, @data_sources,
  @updated_at
) ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  alternate_name = excluded.alternate_name,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  year_built = excluded.year_built,
  year_built_approximate = excluded.year_built_approximate,
  year_built_end = excluded.year_built_end,
  deity = excluded.deity,
  religion = excluded.religion,
  architectural_style = excluded.architectural_style,
  dynasty = excluded.dynasty,
  commissioned_by = excluded.commissioned_by,
  material = excluded.material,
  height_meters = excluded.height_meters,
  heritage_status = excluded.heritage_status,
  part_of_complex = excluded.part_of_complex,
  description = excluded.description,
  history = excluded.history,
  architecture_notes = excluded.architecture_notes,
  significance = excluded.significance,
  image_url = excluded.image_url,
  floor_plan_url = excluded.floor_plan_url,
  wikipedia_url = excluded.wikipedia_url,
  wikidata_id = excluded.wikidata_id,
  country = excluded.country,
  state = excluded.state,
  current_condition = excluded.current_condition,
  engineering = COALESCE(excluded.engineering, temples.engineering),
  archaeology = COALESCE(excluded.archaeology, temples.archaeology),
  visualization = COALESCE(excluded.visualization, temples.visualization),
  graph_tags = COALESCE(excluded.graph_tags, temples.graph_tags),
  data_sources = COALESCE(excluded.data_sources, temples.data_sources),
  updated_at = excluded.updated_at
`;

export function upsertTemple(db: Database.Database, row: TempleRow): void {
  db.prepare(UPSERT_SQL).run(row);
}

export function getTemple(
  db: Database.Database,
  id: string
): TempleRow | undefined {
  return db.prepare("SELECT * FROM temples WHERE id = ?").get(id) as
    | TempleRow
    | undefined;
}

export interface TempleFilters {
  religion?: string;
  country?: string;
  style?: string;
  hasVisualization?: boolean;
  tag?: string;
}

export function getAllTemples(
  db: Database.Database,
  filters?: TempleFilters
): TempleRow[] {
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (filters?.religion) {
    conditions.push("religion = @religion");
    params.religion = filters.religion;
  }
  if (filters?.country) {
    conditions.push("country = @country");
    params.country = filters.country;
  }
  if (filters?.style) {
    conditions.push("architectural_style = @style");
    params.style = filters.style;
  }
  if (filters?.hasVisualization) {
    conditions.push("json_extract(visualization, '$.available') = 1");
  }
  if (filters?.tag) {
    conditions.push(
      "EXISTS (SELECT 1 FROM json_each(graph_tags) WHERE json_each.value = @tag)"
    );
    params.tag = filters.tag;
  }

  const where =
    conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
  return db.prepare(`SELECT * FROM temples${where}`).all(params) as TempleRow[];
}

export function getTemplesByTag(
  db: Database.Database,
  tag: string
): TempleRow[] {
  return db
    .prepare(
      `SELECT * FROM temples
       WHERE EXISTS (SELECT 1 FROM json_each(graph_tags) WHERE json_each.value = ?)`
    )
    .all(tag) as TempleRow[];
}

export function getTempleCount(db: Database.Database): number {
  const row = db.prepare("SELECT COUNT(*) as count FROM temples").get() as {
    count: number;
  };
  return row.count;
}

export function getTagCounts(
  db: Database.Database
): { tag: string; count: number }[] {
  return db
    .prepare(
      `SELECT j.value as tag, COUNT(*) as count
       FROM temples, json_each(temples.graph_tags) j
       GROUP BY j.value
       ORDER BY count DESC`
    )
    .all() as { tag: string; count: number }[];
}
