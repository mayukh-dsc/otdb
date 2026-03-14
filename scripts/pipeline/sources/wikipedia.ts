/**
 * Wikipedia source: fetches architecture sections from temple Wikipedia articles
 * and enriches architecture_notes when the extracted content is richer.
 */

import { openDb, getAllTemples, getTemple, upsertTemple } from "../db.js";
import type { TempleRow } from "../db.js";
import {
  fetchWithRetry,
  createRateLimiter,
  cleanWikitext,
  nowISO,
} from "../utils.js";

const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";
const RATE_LIMIT_MS = 300;

const ARCHITECTURE_KEYWORDS = [
  "drainage",
  "foundation",
  "water system",
  "construction",
  "engineering",
  "layout",
  "structural",
  "materials",
];

interface WikipediaParseResponse {
  parse?: {
    title?: string;
    wikitext?: { "*"?: string };
  };
  error?: { code?: string; info?: string };
}

function extractPageTitleFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    const match = path.match(/\/wiki\/(.+)$/);
    if (match) {
      return decodeURIComponent(match[1].replace(/_/g, " "));
    }
  } catch {
    // invalid URL
  }
  return null;
}

/**
 * Parse wikitext and extract sections whose headers match architecture keywords.
 * Sections use = headers: == Section ==, === Subsection ===
 */
function extractArchitectureSections(wikitext: string): string {
  const sections: string[] = [];
  const lines = wikitext.split("\n");
  let currentSection: string[] = [];
  let inRelevantSection = false;

  for (const line of lines) {
    const headerMatch = line.match(/^(={2,})\s*(.+?)\s*\1\s*$/);
    if (headerMatch) {
      const title = headerMatch[2].trim().toLowerCase();

      if (currentSection.length > 0 && inRelevantSection) {
        sections.push(currentSection.join("\n").trim());
      }
      currentSection = [];
      inRelevantSection = ARCHITECTURE_KEYWORDS.some((kw) =>
        title.includes(kw)
      );
    } else if (inRelevantSection) {
      currentSection.push(line);
    }
  }

  if (currentSection.length > 0 && inRelevantSection) {
    sections.push(currentSection.join("\n").trim());
  }

  const combined = sections.filter((s) => s.length > 20).join("\n\n");
  return cleanWikitext(combined);
}

function isRicher(extracted: string, existing: string | null): boolean {
  const ext = extracted.trim();
  if (ext.length < 50) return false;
  const exist = (existing ?? "").trim();
  return ext.length > exist.length;
}

export async function run(args: {
  temple?: string;
  force?: boolean;
  dryRun?: boolean;
}): Promise<number> {
  const db = openDb();
  const rateLimit = createRateLimiter(RATE_LIMIT_MS);

  let temples: TempleRow[];
  if (args.temple) {
    const t = getTemple(db, args.temple);
    temples = t ? [t] : [];
  } else {
    temples = getAllTemples(db);
  }

  const withWikipedia = temples.filter(
    (t) => t.wikipedia_url && t.wikipedia_url.length > 0
  );
  console.log(
    `[wikipedia] Processing ${withWikipedia.length} temples with Wikipedia URLs`
  );

  let updated = 0;

  for (const temple of withWikipedia) {
    try {
      const wikiUrl = temple.wikipedia_url;
      if (!wikiUrl) continue;
      const pageTitle = extractPageTitleFromUrl(wikiUrl);
      if (!pageTitle) {
        console.log(`  [wikipedia] Skipping ${temple.id}: invalid URL`);
        continue;
      }

      await rateLimit();

      const params = new URLSearchParams({
        action: "parse",
        prop: "wikitext",
        format: "json",
        page: pageTitle,
      });
      const url = `${WIKIPEDIA_API}?${params.toString()}`;
      const res = await fetchWithRetry(url);
      const data = (await res.json()) as WikipediaParseResponse;

      if (data.error) {
        console.warn(
          `  [wikipedia] API error for ${temple.id}: ${data.error.info ?? data.error.code}`
        );
        continue;
      }

      const wikitext = data.parse?.wikitext?.["*"];
      if (!wikitext) {
        console.log(`  [wikipedia] No wikitext for ${temple.id}`);
        continue;
      }

      const extracted = extractArchitectureSections(wikitext);
      if (!isRicher(extracted, temple.architecture_notes)) {
        continue;
      }

      if (args.dryRun) {
        console.log(
          `  [wikipedia] Would update ${temple.id} (${temple.name}) - ${extracted.length} chars`
        );
        updated++;
        continue;
      }

      const updatedRow: TempleRow = {
        ...temple,
        architecture_notes: extracted,
        updated_at: nowISO(),
      };
      upsertTemple(db, updatedRow);
      console.log(
        `  [wikipedia] Updated ${temple.id} (${temple.name}) - ${extracted.length} chars`
      );
      updated++;
    } catch (err) {
      console.warn(
        `  [wikipedia] Error processing ${temple.id}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  return updated;
}
