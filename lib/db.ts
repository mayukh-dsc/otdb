import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Temple, TempleSummary, BBox, PaginatedResult } from "./types";

const JSON_PATH = join(process.cwd(), "data", "temples.json");

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 1000;

// Spatial grid resolution — each cell is ~1 degree lat/lng
const GRID_RESOLUTION = 1;

interface DataStore {
  all: Temple[];
  byId: Map<string, Temple>;
  byReligion: Map<string, Temple[]>;
  byCountry: Map<string, Temple[]>;
  byStyle: Map<string, Temple[]>;
  byTag: Map<string, Temple[]>;
  geoGrid: Map<string, Temple[]>;
}

let _store: DataStore | null = null;

function geoKey(lat: number, lng: number): string {
  const gLat = Math.floor(lat / GRID_RESOLUTION);
  const gLng = Math.floor(lng / GRID_RESOLUTION);
  return `${gLat}:${gLng}`;
}

function addToIndex(map: Map<string, Temple[]>, key: string | undefined | null, temple: Temple) {
  if (!key) return;
  const list = map.get(key);
  if (list) {
    list.push(temple);
  } else {
    map.set(key, [temple]);
  }
}

function buildStore(): DataStore {
  const raw = readFileSync(JSON_PATH, "utf-8");
  const all = JSON.parse(raw) as Temple[];

  const byId = new Map<string, Temple>();
  const byReligion = new Map<string, Temple[]>();
  const byCountry = new Map<string, Temple[]>();
  const byStyle = new Map<string, Temple[]>();
  const byTag = new Map<string, Temple[]>();
  const geoGrid = new Map<string, Temple[]>();

  for (const t of all) {
    byId.set(t.id, t);
    addToIndex(byReligion, t.religion, t);
    addToIndex(byCountry, t.country, t);
    addToIndex(byStyle, t.architecturalStyle, t);
    addToIndex(geoGrid, geoKey(t.latitude, t.longitude), t);

    if (t.graphTags) {
      for (const tag of t.graphTags) {
        addToIndex(byTag, tag, t);
      }
    }
  }

  return { all, byId, byReligion, byCountry, byStyle, byTag, geoGrid };
}

function getStore(): DataStore {
  _store ??= buildStore();
  return _store;
}

function inBBox(t: { latitude: number; longitude: number }, bbox: BBox): boolean {
  return (
    t.latitude >= bbox.south &&
    t.latitude <= bbox.north &&
    t.longitude >= bbox.west &&
    t.longitude <= bbox.east
  );
}

function queryByBBox(store: DataStore, bbox: BBox): Temple[] {
  const minGLat = Math.floor(bbox.south / GRID_RESOLUTION);
  const maxGLat = Math.floor(bbox.north / GRID_RESOLUTION);
  const minGLng = Math.floor(bbox.west / GRID_RESOLUTION);
  const maxGLng = Math.floor(bbox.east / GRID_RESOLUTION);

  const seen = new Set<string>();
  const result: Temple[] = [];

  for (let gLat = minGLat; gLat <= maxGLat; gLat++) {
    for (let gLng = minGLng; gLng <= maxGLng; gLng++) {
      const cell = store.geoGrid.get(`${gLat}:${gLng}`);
      if (!cell) continue;
      for (const t of cell) {
        if (!seen.has(t.id) && inBBox(t, bbox)) {
          seen.add(t.id);
          result.push(t);
        }
      }
    }
  }

  return result;
}

export interface QueryFilters {
  religion?: string;
  country?: string;
  style?: string;
  hasVisualization?: boolean;
  tag?: string;
  bbox?: BBox;
  search?: string;
}

function pickSmallestIndexedSet(store: DataStore, filters: QueryFilters): Temple[] | null {
  const candidates: Temple[][] = [];

  if (filters.religion) {
    candidates.push(store.byReligion.get(filters.religion) ?? []);
  }
  if (filters.country) {
    candidates.push(store.byCountry.get(filters.country) ?? []);
  }
  if (filters.style) {
    candidates.push(store.byStyle.get(filters.style) ?? []);
  }
  if (filters.tag) {
    candidates.push(store.byTag.get(filters.tag) ?? []);
  }
  if (filters.bbox) {
    candidates.push(queryByBBox(store, filters.bbox));
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => a.length - b.length);
  return candidates[0];
}

function applyFilters(store: DataStore, filters?: QueryFilters): Temple[] {
  if (!filters) return store.all;

  const hasAny =
    filters.religion || filters.country || filters.style ||
    filters.tag || filters.bbox || filters.hasVisualization || filters.search;
  if (!hasAny) return store.all;

  let result = pickSmallestIndexedSet(store, filters) ?? store.all;

  if (filters.religion) {
    result = result.filter((t) => t.religion === filters.religion);
  }
  if (filters.country) {
    result = result.filter((t) => t.country === filters.country);
  }
  if (filters.style) {
    result = result.filter((t) => t.architecturalStyle === filters.style);
  }
  if (filters.hasVisualization) {
    result = result.filter((t) => t.visualization?.available);
  }
  if (filters.tag) {
    const tag = filters.tag;
    result = result.filter((t) => t.graphTags?.includes(tag));
  }
  if (filters.bbox) {
    const bbox = filters.bbox;
    result = result.filter((t) => inBBox(t, bbox));
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.alternateName?.toLowerCase().includes(q)
    );
  }

  return result;
}

function toSummary(t: Temple): TempleSummary {
  return {
    id: t.id,
    name: t.name,
    latitude: t.latitude,
    longitude: t.longitude,
    yearBuilt: t.yearBuilt,
    yearBuiltApproximate: t.yearBuiltApproximate,
    religion: t.religion,
    architecturalStyle: t.architecturalStyle,
    dynasty: t.dynasty,
    country: t.country,
    imageUrl: t.imageUrl,
    graphTags: t.graphTags,
  };
}

export function queryTemplesSummary(
  filters?: QueryFilters,
  limit = DEFAULT_LIMIT,
  offset = 0
): PaginatedResult<TempleSummary> {
  const store = getStore();
  const filtered = applyFilters(store, filters);
  const clampedLimit = Math.min(Math.max(1, limit), MAX_LIMIT);
  const clampedOffset = Math.max(0, offset);
  const page = filtered.slice(clampedOffset, clampedOffset + clampedLimit);

  return {
    data: page.map(toSummary),
    total: filtered.length,
    limit: clampedLimit,
    offset: clampedOffset,
    hasMore: clampedOffset + clampedLimit < filtered.length,
  };
}

export function queryTemples(filters?: QueryFilters): Temple[] {
  return applyFilters(getStore(), filters);
}

export function queryTempleById(id: string): Temple | null {
  return getStore().byId.get(id) ?? null;
}

export function queryTemplesByTag(tag: string): Temple[] {
  return getStore().byTag.get(tag) ?? [];
}

export function queryTagCounts(): { tag: string; count: number }[] {
  const store = getStore();
  const counts: { tag: string; count: number }[] = [];

  for (const [tag, temples] of store.byTag) {
    counts.push({ tag, count: temples.length });
  }

  return counts.sort((a, b) => b.count - a.count);
}
