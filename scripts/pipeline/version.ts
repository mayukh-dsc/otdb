import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_PATH = join(__dirname, "..", "..", "data", "pipeline-state.json");

export interface SourceState {
  lastRun: string | null;
  templesUpdated: number;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  summary: string;
}

export interface PipelineState {
  dataVersion: string;
  schemaVersion: string;
  lastFullRun: string | null;
  sources: Record<string, SourceState>;
  changelog: ChangelogEntry[];
}

const DEFAULT_STATE: PipelineState = {
  dataVersion: "1.0.0",
  schemaVersion: "1.0.0",
  lastFullRun: null,
  sources: {
    asi: { lastRun: null, templesUpdated: 0 },
    wikidata: { lastRun: null, templesUpdated: 0 },
    wikipedia: { lastRun: null, templesUpdated: 0 },
    commons: { lastRun: null, templesUpdated: 0 },
    "data-gov": { lastRun: null, templesUpdated: 0 },
  },
  changelog: [],
};

export function readState(): PipelineState {
  if (!existsSync(STATE_PATH)) return { ...DEFAULT_STATE };

  try {
    return JSON.parse(readFileSync(STATE_PATH, "utf-8"));
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function writeState(state: PipelineState): void {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + "\n");
}

type BumpType = "major" | "minor" | "patch";

export function bumpVersion(current: string, type: BumpType): string {
  const [major, minor, patch] = current.split(".").map(Number);
  switch (type) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
  }
}

export function recordSourceRun(
  state: PipelineState,
  source: string,
  templesUpdated: number
): void {
  state.sources[source] = {
    lastRun: new Date().toISOString(),
    templesUpdated,
  };
}

export function addChangelog(
  state: PipelineState,
  summary: string,
  bumpType: BumpType = "minor"
): void {
  state.dataVersion = bumpVersion(state.dataVersion, bumpType);
  state.changelog.unshift({
    version: state.dataVersion,
    date: new Date().toISOString().split("T")[0],
    summary,
  });
  if (state.changelog.length > 50) {
    state.changelog = state.changelog.slice(0, 50);
  }
}
