import type { Temple } from "./types";

export type SimilarityMode = "off" | "style" | "complex" | "dynasty" | "religion" | "century";

export interface SimilarityEdge {
  from: [number, number]; // [lat, lng]
  to: [number, number];
  group: string;
  color: string;
}

const MAX_EDGES_PER_GROUP = 30;

function normalize(s: string | undefined | null): string {
  if (!s) return "";
  return s.trim().toLowerCase();
}

function getCentury(year: number): string {
  if (!year) return "";
  if (year < 0) return `${Math.ceil(Math.abs(year) / 100)} BC`;
  return `${Math.ceil(year / 100)} AD`;
}

function getGroupKey(temple: Temple, mode: SimilarityMode): string {
  switch (mode) {
    case "style":
      return normalize(temple.architecturalStyle);
    case "complex":
      return normalize(temple.partOfComplex);
    case "dynasty":
      return normalize(temple.dynasty);
    case "religion":
      return normalize(temple.religion);
    case "century":
      return temple.yearBuilt ? getCentury(temple.yearBuilt) : "";
    default:
      return "";
  }
}

function hashToHue(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (str.codePointAt(i) ?? 0) + ((hash << 5) - hash);
  }
  return ((hash % 360) + 360) % 360;
}

function groupColor(group: string): string {
  const hue = hashToHue(group);
  return `hsl(${hue}, 70%, 55%)`;
}

/**
 * Haversine distance in km — used for nearest-neighbor spanning tree
 * when a group is too large for full mesh.
 */
function haversine(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a[0] * Math.PI) / 180) *
      Math.cos((b[0] * Math.PI) / 180) *
      sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * For small groups (<=8 temples), create full mesh edges.
 * For larger groups, build a nearest-neighbor chain to avoid clutter.
 */
function buildGroupEdges(
  temples: Temple[],
  group: string
): Array<{ from: [number, number]; to: [number, number] }> {
  if (temples.length < 2) return [];

  const coords: [number, number][] = temples.map((t) => [t.latitude, t.longitude]);

  if (temples.length <= 8) {
    const edges: Array<{ from: [number, number]; to: [number, number] }> = [];
    for (let i = 0; i < coords.length; i++) {
      for (let j = i + 1; j < coords.length; j++) {
        edges.push({ from: coords[i], to: coords[j] });
      }
    }
    return edges.slice(0, MAX_EDGES_PER_GROUP);
  }

  // Greedy nearest-neighbor spanning tree for larger groups
  const edges: Array<{ from: [number, number]; to: [number, number] }> = [];
  const remaining = new Set(coords.map((_, i) => i));
  remaining.delete(0);

  let current = 0;
  while (remaining.size > 0 && edges.length < MAX_EDGES_PER_GROUP) {
    let nearest = -1;
    let nearestDist = Infinity;
    for (const idx of remaining) {
      const d = haversine(coords[current], coords[idx]);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = idx;
      }
    }
    if (nearest === -1) break;
    edges.push({ from: coords[current], to: coords[nearest] });
    remaining.delete(nearest);
    current = nearest;
  }

  return edges;
}

export function buildSimilarityEdges(
  temples: Temple[],
  mode: SimilarityMode
): SimilarityEdge[] {
  if (mode === "off") return [];

  const groups = new Map<string, Temple[]>();

  for (const temple of temples) {
    const key = getGroupKey(temple, mode);
    if (!key) continue;
    const list = groups.get(key) || [];
    list.push(temple);
    groups.set(key, list);
  }

  const result: SimilarityEdge[] = [];

  for (const [group, members] of groups) {
    if (members.length < 2) continue;
    const color = groupColor(group);
    const edges = buildGroupEdges(members, group);
    for (const edge of edges) {
      result.push({ ...edge, group, color });
    }
  }

  return result;
}

export const SIMILARITY_MODES: { value: SimilarityMode; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "style", label: "Style" },
  { value: "complex", label: "Complex" },
  { value: "dynasty", label: "Dynasty" },
  { value: "religion", label: "Religion" },
  { value: "century", label: "Century" },
];
