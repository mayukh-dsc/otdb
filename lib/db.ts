import Database from "better-sqlite3";
import { join } from "path";
import type { Temple } from "./types";

const DB_PATH = join(process.cwd(), "data", "temples.db");

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH, { readonly: true });
    _db.pragma("journal_mode = WAL");
  }
  return _db;
}

interface RawRow {
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
  description: string;
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
}

function rowToTemple(row: RawRow): Temple {
  return {
    id: row.id,
    name: row.name,
    alternateName: row.alternate_name ?? undefined,
    latitude: row.latitude,
    longitude: row.longitude,
    yearBuilt: row.year_built ?? 0,
    yearBuiltApproximate: row.year_built_approximate === 1,
    yearBuiltEnd: row.year_built_end ?? undefined,
    deity: row.deity ?? undefined,
    religion: row.religion as Temple["religion"],
    architecturalStyle: row.architectural_style ?? undefined,
    dynasty: row.dynasty ?? undefined,
    commissionedBy: row.commissioned_by ?? undefined,
    material: row.material ?? undefined,
    heightMeters: row.height_meters ?? undefined,
    heritageStatus: row.heritage_status ?? undefined,
    partOfComplex: row.part_of_complex ?? undefined,
    description: row.description,
    history: row.history ?? undefined,
    architectureNotes: row.architecture_notes ?? undefined,
    significance: row.significance ?? undefined,
    floorPlanUrl: row.floor_plan_url ?? undefined,
    imageUrl: row.image_url ?? undefined,
    wikipediaUrl: row.wikipedia_url ?? undefined,
    wikidataId: row.wikidata_id ?? row.id,
    country: row.country,
    state: row.state ?? undefined,
    currentCondition: (row.current_condition as Temple["currentCondition"]) ?? undefined,
    engineering: row.engineering ? JSON.parse(row.engineering) : undefined,
    archaeology: row.archaeology ? JSON.parse(row.archaeology) : undefined,
    visualization: row.visualization ? JSON.parse(row.visualization) : undefined,
    graphTags: row.graph_tags ? JSON.parse(row.graph_tags) : undefined,
  };
}

export interface QueryFilters {
  religion?: string;
  country?: string;
  style?: string;
  hasVisualization?: boolean;
  tag?: string;
}

export function queryTemples(filters?: QueryFilters): Temple[] {
  const db = getDb();
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

  const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
  const rows = db
    .prepare(`SELECT * FROM temples${where} ORDER BY name`)
    .all(params) as RawRow[];

  return rows.map(rowToTemple);
}

export function queryTempleById(id: string): Temple | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM temples WHERE id = ?").get(id) as RawRow | undefined;
  return row ? rowToTemple(row) : null;
}

export function queryTemplesByTag(tag: string): Temple[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM temples
       WHERE EXISTS (SELECT 1 FROM json_each(graph_tags) WHERE json_each.value = ?)
       ORDER BY name`
    )
    .all(tag) as RawRow[];
  return rows.map(rowToTemple);
}

export function queryTagCounts(): { tag: string; count: number }[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT j.value as tag, COUNT(*) as count
       FROM temples, json_each(temples.graph_tags) j
       GROUP BY j.value
       ORDER BY count DESC`
    )
    .all() as { tag: string; count: number }[];
}
