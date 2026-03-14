-- OTDB Temple Database Schema
-- Source of truth for the SQLite database structure.
-- Run migrate-to-sqlite.ts to create/recreate from temples.json.

CREATE TABLE IF NOT EXISTS temples (
  id                     TEXT PRIMARY KEY,   -- Wikidata QID lowercase e.g. "q916943"
  name                   TEXT NOT NULL,
  alternate_name         TEXT,
  latitude               REAL NOT NULL,
  longitude              REAL NOT NULL,
  year_built             INTEGER,
  year_built_approximate INTEGER DEFAULT 0,  -- boolean 0/1
  year_built_end         INTEGER,
  deity                  TEXT,
  religion               TEXT NOT NULL,      -- "Hindu" | "Buddhist" | "Jain" | "Other"
  architectural_style    TEXT,
  dynasty                TEXT,
  commissioned_by        TEXT,
  material               TEXT,
  height_meters          REAL,
  heritage_status        TEXT,
  part_of_complex        TEXT,
  description            TEXT,
  history                TEXT,
  architecture_notes     TEXT,
  significance           TEXT,
  image_url              TEXT,
  floor_plan_url         TEXT,
  wikipedia_url          TEXT,
  wikidata_id            TEXT,
  country                TEXT NOT NULL,
  state                  TEXT,
  current_condition      TEXT,

  -- Enrichment columns (JSON)
  engineering            JSON,               -- TempleEngineering object
  archaeology            JSON,               -- TempleArchaeology object
  visualization          JSON,               -- TempleVisualization object
  graph_tags             JSON,               -- string[] for relationships / feature badges
  data_sources           JSON,               -- per-field source attribution

  updated_at             TEXT                 -- ISO 8601 timestamp of last pipeline update
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_temples_religion ON temples(religion);
CREATE INDEX IF NOT EXISTS idx_temples_country ON temples(country);
CREATE INDEX IF NOT EXISTS idx_temples_style ON temples(architectural_style);
CREATE INDEX IF NOT EXISTS idx_temples_year ON temples(year_built);
CREATE INDEX IF NOT EXISTS idx_temples_complex ON temples(part_of_complex);
CREATE INDEX IF NOT EXISTS idx_temples_condition ON temples(current_condition);

-- Handbook terms table for the glossary / feature iconography system
CREATE TABLE IF NOT EXISTS handbook_terms (
  slug                   TEXT PRIMARY KEY,   -- e.g. "dry-fit", "vimana", "stellate"
  name                   TEXT NOT NULL,      -- "Dry-fit Construction"
  original_term          TEXT,               -- Sanskrit/Tamil original e.g. "Sushka-sandhi"
  category               TEXT NOT NULL,      -- "anatomy"|"style"|"technique"|"material"|"water"|"plan"|"environmental"
  short_description      TEXT NOT NULL,      -- 1-2 sentence summary
  full_description       TEXT,               -- detailed explanation
  diagram_url            TEXT,               -- annotated illustration URL
  icon                   TEXT NOT NULL,      -- icon identifier for badge rendering
  graph_tag              TEXT NOT NULL UNIQUE -- maps to temples.graph_tags e.g. "technique:dry-fit"
);

CREATE INDEX IF NOT EXISTS idx_handbook_category ON handbook_terms(category);
CREATE INDEX IF NOT EXISTS idx_handbook_graph_tag ON handbook_terms(graph_tag);
