/**
 * ASI (Archaeological Survey of India) data pipeline source.
 * Scrapes monument pages and TSP drawing galleries for temple data.
 *
 * Targets:
 * - asi.nic.in — monument pages with engineering dimensions
 * - tspasibhopal.nic.in/gallery/drawing_gallery/plans_of_the_temples.html — floor plans
 * - tspasibhopal.nic.in/gallery/drawing_gallery/elevation_of_the_temples.html — elevations
 */

import { openDb } from "../db.js";
import type { TempleRow } from "../db.js";
import {
  fetchWithRetry,
  createRateLimiter,
  fuzzyMatch,
  nowISO,
} from "../utils.js";
import type { TempleEngineering, TempleVisualization, ImageRef } from "../../../lib/types.js";
import { PIPELINE_CONFIG } from "../config.js";

const TSP_BASE = "https://tspasibhopal.nic.in";
const PLANS_URL = `${TSP_BASE}/gallery/drawing_gallery/plans_of_the_temples.html`;
const ELEVATION_URL = `${TSP_BASE}/gallery/drawing_gallery/elevation_of_the_temples.html`;

const FUZZY_THRESHOLD = 0.5;

interface GalleryItem {
  name: string;
  imageUrl: string;
  pageUrl: string;
}

interface AsiRunArgs {
  temple?: string;
  force?: boolean;
  dryRun?: boolean;
}

function createAsiAttribution(): ImageRef["attribution"] {
  return {
    source: "asi",
    url: TSP_BASE,
    fetchedAt: nowISO(),
  };
}

/**
 * Parse TSP gallery HTML for temple names and image URLs.
 * Handles common patterns: links to images, img src, captions in alt/title.
 */
function parseTspGalleryHtml(html: string, pageUrl: string): GalleryItem[] {
  const items: GalleryItem[] = [];
  const baseUrl = pageUrl.replace(/\/[^/]*$/, "/");

  // Match <a href="...image...">...caption...</a> or similar link patterns
  const linkRegex = /<a\s+[^>]*href=["']([^"']+\.(?:jpg|jpeg|png|gif|webp))["'][^>]*>([^<]*)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRegex.exec(html)) !== null) {
    const href = m[1];
    const caption = m[2].replaceAll(/<[^>]+>/g, "").trim();
    const fullUrl = href.startsWith("http") ? href : new URL(href, baseUrl).href;
    const name = caption || extractNameFromFilename(href);
    if (name) {
      items.push({ name, imageUrl: fullUrl, pageUrl });
    }
  }

  // Match <img src="..." alt="..."> or title="..." for captions
  const imgRegex = /<img[^>]*src=["']([^"']+)["'][^>]*(?:alt|title)=["']([^"']*)["'][^>]*>/gi;
  while ((m = imgRegex.exec(html)) !== null) {
    const src = m[1];
    const alt = m[2].trim();
    if (src.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      const fullUrl = src.startsWith("http") ? src : new URL(src, baseUrl).href;
      const name = alt || extractNameFromFilename(src);
      if (name && !items.some((i) => i.imageUrl === fullUrl)) {
        items.push({ name, imageUrl: fullUrl, pageUrl });
      }
    }
  }

  // Fallback: any img with src to image file, use filename as hint
  if (items.length === 0) {
    const fallbackRegex = /<img[^>]*src=["']([^"']+\.(?:jpg|jpeg|png|gif|webp))["'][^>]*>/gi;
    while ((m = fallbackRegex.exec(html)) !== null) {
      const src = m[1];
      const fullUrl = src.startsWith("http") ? src : new URL(src, baseUrl).href;
      const name = extractNameFromFilename(src);
      if (name) {
        items.push({ name, imageUrl: fullUrl, pageUrl });
      }
    }
  }

  return items;
}

function extractNameFromFilename(path: string): string {
  const filename = path.split("/").pop() ?? path;
  return filename
    .replace(/_\d*\.(jpg|jpeg|png|gif|webp)$/i, "")
    .replaceAll(/[-_]/g, " ")
    .replaceAll(/\d+/g, " ")
    .trim() || "Unknown";
}

/**
 * Find best matching temple from DB by fuzzy matching name.
 */
function findBestMatch(
  items: GalleryItem[],
  temples: TempleRow[],
  templeFilter?: string
): Map<string, { item: GalleryItem; temple: TempleRow; score: number }> {
  const matches = new Map<
    string,
    { item: GalleryItem; temple: TempleRow; score: number }
  >();
  const filteredTemples = templeFilter
    ? temples.filter(
        (t) =>
          t.id === templeFilter ||
          t.name.toLowerCase().includes(templeFilter.toLowerCase())
      )
    : temples;

  for (const item of items) {
    let best: { temple: TempleRow; score: number } | null = null;

    for (const temple of filteredTemples) {
      const nameScore = fuzzyMatch(item.name, temple.name);
      const altScore = temple.alternate_name
        ? fuzzyMatch(item.name, temple.alternate_name)
        : 0;
      const score = Math.max(nameScore, altScore);

      if (score >= FUZZY_THRESHOLD && (!best || score > best.score)) {
        best = { temple, score };
      }
    }

    if (best) {
      const existing = matches.get(best.temple.id);
      if (!existing || best.score > existing.score) {
        matches.set(best.temple.id, { item, temple: best.temple, score: best.score });
      }
    }
  }

  return matches;
}

/**
 * Fetch and parse a TSP gallery page. Returns empty array on failure.
 */
async function fetchGalleryPage(
  url: string,
  rateLimit: () => Promise<void>,
  type: "floorPlan" | "elevation"
): Promise<GalleryItem[]> {
  try {
    await rateLimit();
    console.log(`    Fetching ${type}: ${url}`);
    const res = await fetchWithRetry(url, {
      retries: PIPELINE_CONFIG.sources.asi.retries,
      delayMs: 1000,
    });
    const html = await res.text();
    const items = parseTspGalleryHtml(html, url);
    console.log(`    Parsed ${items.length} ${type} items from ${url}`);
    return items;
  } catch (err) {
    console.warn(
      `    ASI: Could not fetch ${url}:`,
      err instanceof Error ? err.message : err
    );
    return [];
  }
}

export async function run(args: AsiRunArgs): Promise<number> {
  const { temple: templeFilter, dryRun = false } = args;
  const db = openDb();
  const rateLimitMs = PIPELINE_CONFIG.sources.asi.rateLimitMs ?? 500;
  const rateLimit = createRateLimiter(rateLimitMs);

  console.log(`    ASI source: rate limit ${rateLimitMs}ms, dryRun=${dryRun}`);

  const temples = db.prepare("SELECT * FROM temples").all() as TempleRow[];
  if (temples.length === 0) {
    console.log("    ASI: No temples in database");
    return 0;
  }

  if (templeFilter) {
    console.log(`    ASI: Filtering for temple: ${templeFilter}`);
  }

  const plansItems = await fetchGalleryPage(
    PLANS_URL,
    rateLimit,
    "floorPlan"
  );
  const elevationItems = await fetchGalleryPage(
    ELEVATION_URL,
    rateLimit,
    "elevation"
  );

  const planMatches = findBestMatch(plansItems, temples, templeFilter);
  const elevationMatches = findBestMatch(elevationItems, temples, templeFilter);

  const updateStmt = db.prepare(
    "UPDATE temples SET engineering = ?, visualization = ?, updated_at = ? WHERE id = ?"
  );

  const allMatchedIds = new Set([
    ...planMatches.keys(),
    ...elevationMatches.keys(),
  ]);
  let count = 0;

  for (const id of allMatchedIds) {
    const temple = temples.find((t) => t.id === id);
    if (!temple) continue;

    const existingEng: TempleEngineering = temple.engineering
      ? (JSON.parse(temple.engineering) as TempleEngineering)
      : {};
    const existingViz: TempleVisualization = temple.visualization
      ? (JSON.parse(temple.visualization) as TempleVisualization)
      : { available: false };

    const eng: TempleEngineering = { ...existingEng };
    const viz: TempleVisualization = {
      ...existingViz,
      available:
        existingViz.available ||
        planMatches.has(id) ||
        elevationMatches.has(id),
    };

    const attribution = createAsiAttribution();
    let vizChanged = false;

    const planMatch = planMatches.get(id);
    if (planMatch) {
      const imageRef: ImageRef = {
        url: planMatch.item.imageUrl,
        caption: planMatch.item.name,
        attribution,
      };
      const existing = viz.floorPlanUrls ?? [];
      if (!existing.some((r) => r.url === imageRef.url)) {
        viz.floorPlanUrls = [...existing, imageRef];
        vizChanged = true;
      }
    }

    const elevMatch = elevationMatches.get(id);
    if (elevMatch) {
      const imageRef: ImageRef = {
        url: elevMatch.item.imageUrl,
        caption: elevMatch.item.name,
        attribution,
      };
      const existing = viz.elevationUrls ?? [];
      if (!existing.some((r) => r.url === imageRef.url)) {
        viz.elevationUrls = [...existing, imageRef];
        vizChanged = true;
      }
    }

    if (vizChanged) {
      if (!dryRun) {
        updateStmt.run(
          JSON.stringify(eng),
          JSON.stringify(viz),
          nowISO(),
          id
        );
      }
      count++;
      console.log(`    Matched: ${temple.name} (${id}) — added TSP images`);
    }
  }
  console.log(`    ASI: ${count} temples updated with TSP gallery data`);
  return count;
}
