import { readFileSync } from "fs";
import { join } from "path";
import type { Temple } from "./types";

const JSON_PATH = join(process.cwd(), "data", "temples.json");

let _cache: Temple[] | null = null;

function getTemples(): Temple[] {
  if (!_cache) {
    const raw = readFileSync(JSON_PATH, "utf-8");
    _cache = JSON.parse(raw) as Temple[];
  }
  return _cache;
}

export interface QueryFilters {
  religion?: string;
  country?: string;
  style?: string;
  hasVisualization?: boolean;
  tag?: string;
}

export function queryTemples(filters?: QueryFilters): Temple[] {
  let temples = getTemples();

  if (!filters) return temples;

  if (filters.religion) {
    temples = temples.filter((t) => t.religion === filters.religion);
  }
  if (filters.country) {
    temples = temples.filter((t) => t.country === filters.country);
  }
  if (filters.style) {
    temples = temples.filter((t) => t.architecturalStyle === filters.style);
  }
  if (filters.hasVisualization) {
    temples = temples.filter((t) => t.visualization?.available);
  }
  if (filters.tag) {
    const tag = filters.tag;
    temples = temples.filter((t) => t.graphTags?.includes(tag));
  }

  return temples;
}

export function queryTempleById(id: string): Temple | null {
  return getTemples().find((t) => t.id === id) ?? null;
}

export function queryTemplesByTag(tag: string): Temple[] {
  return getTemples().filter((t) => t.graphTags?.includes(tag));
}

export function queryTagCounts(): { tag: string; count: number }[] {
  const counts = new Map<string, number>();

  for (const temple of getTemples()) {
    if (!temple.graphTags) continue;
    for (const tag of temple.graphTags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}
