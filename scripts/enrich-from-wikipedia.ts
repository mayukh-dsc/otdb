/**
 * Enrichment script: pulls descriptions and history from Wikipedia.
 * Run with: npx tsx scripts/enrich-from-wikipedia.ts
 * Requires temples-raw.json to exist (from seed-from-wikidata.ts).
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const WIKI_API = "https://en.wikipedia.org/w/api.php";
const BATCH_SIZE = 20;
const DELAY_MS = 500;

interface RawTemple {
  id: string;
  name: string;
  wikipediaUrl?: string;
  description: string;
  history?: string;
  architectureNotes?: string;
  [key: string]: unknown;
}

function extractTitleFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const path = u.pathname;
    if (path.startsWith("/wiki/")) {
      return decodeURIComponent(path.slice(6));
    }
  } catch {
    // ignore
  }
  return null;
}

async function fetchSummaries(
  titles: string[]
): Promise<Map<string, { extract: string }>> {
  const results = new Map<string, { extract: string }>();

  const params = new URLSearchParams({
    action: "query",
    prop: "extracts",
    exintro: "1",
    explaintext: "1",
    titles: titles.join("|"),
    format: "json",
    redirects: "1",
  });

  const res = await fetch(`${WIKI_API}?${params}`, {
    headers: {
      "User-Agent": "OTDB-TempleDatabase/1.0 (educational project)",
    },
  });

  if (!res.ok) return results;

  const data = await res.json();
  const pages = data.query?.pages;
  if (!pages) return results;

  for (const pageId of Object.keys(pages)) {
    const page = pages[pageId];
    if (page.extract && page.title) {
      results.set(page.title, { extract: page.extract });
    }
  }

  return results;
}

async function fetchSections(
  title: string
): Promise<{ history?: string; architecture?: string }> {
  const params = new URLSearchParams({
    action: "parse",
    page: title,
    prop: "sections",
    format: "json",
    redirects: "1",
  });

  const res = await fetch(`${WIKI_API}?${params}`, {
    headers: {
      "User-Agent": "OTDB-TempleDatabase/1.0 (educational project)",
    },
  });

  if (!res.ok) return {};

  const data = await res.json();
  const sections = data.parse?.sections;
  if (!sections) return {};

  let historyIdx: string | null = null;
  let archIdx: string | null = null;

  for (const s of sections) {
    const line = (s.line as string).toLowerCase();
    if (
      !historyIdx &&
      (line === "history" || line.includes("history"))
    ) {
      historyIdx = s.index;
    }
    if (
      !archIdx &&
      (line === "architecture" ||
        line.includes("architecture") ||
        line.includes("structure") ||
        line.includes("layout"))
    ) {
      archIdx = s.index;
    }
  }

  const result: { history?: string; architecture?: string } = {};

  if (historyIdx) {
    result.history = await fetchSectionText(title, historyIdx);
  }
  if (archIdx) {
    result.architecture = await fetchSectionText(title, archIdx);
  }

  return result;
}

async function fetchSectionText(
  title: string,
  sectionIndex: string
): Promise<string | undefined> {
  const params = new URLSearchParams({
    action: "parse",
    page: title,
    prop: "wikitext",
    section: sectionIndex,
    format: "json",
    redirects: "1",
  });

  const res = await fetch(`${WIKI_API}?${params}`, {
    headers: {
      "User-Agent": "OTDB-TempleDatabase/1.0 (educational project)",
    },
  });

  if (!res.ok) return undefined;

  const data = await res.json();
  const wikitext: string | undefined = data.parse?.wikitext?.["*"];
  if (!wikitext) return undefined;

  return cleanWikitext(wikitext);
}

function cleanWikitext(text: string): string {
  return (
    text
      // remove ref tags and contents
      .replace(/<ref[^>]*\/>/g, "")
      .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, "")
      // remove HTML tags
      .replace(/<[^>]+>/g, "")
      // remove file/image links
      .replace(/\[\[(?:File|Image):[^\]]*\]\]/gi, "")
      // convert wikilinks [[Target|Text]] → Text, [[Target]] → Target
      .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, "$1")
      // remove templates (simple ones)
      .replace(/\{\{[^}]*\}\}/g, "")
      // remove section headers
      .replace(/^=+\s*.*?\s*=+$/gm, "")
      // collapse whitespace
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const dataDir = join(__dirname, "..", "data");
  const rawPath = join(dataDir, "temples-raw.json");

  let temples: RawTemple[];
  try {
    temples = JSON.parse(readFileSync(rawPath, "utf-8"));
  } catch {
    console.error("Could not read temples-raw.json. Run seed-from-wikidata.ts first.");
    process.exit(1);
  }

  const withWiki = temples.filter((t) => t.wikipediaUrl);
  console.log(
    `Enriching ${withWiki.length} temples that have Wikipedia articles (of ${temples.length} total)...`
  );

  const titleToTemple = new Map<string, RawTemple>();
  for (const t of withWiki) {
    const title = extractTitleFromUrl(t.wikipediaUrl!);
    if (title) titleToTemple.set(title, t);
  }

  const allTitles = Array.from(titleToTemple.keys());

  // Fetch summaries in batches
  for (let i = 0; i < allTitles.length; i += BATCH_SIZE) {
    const batch = allTitles.slice(i, i + BATCH_SIZE);
    console.log(
      `  Fetching summaries ${i + 1}-${Math.min(i + BATCH_SIZE, allTitles.length)} of ${allTitles.length}...`
    );

    const summaries = await fetchSummaries(batch);
    for (const [title, data] of summaries) {
      const temple = titleToTemple.get(title);
      if (temple && data.extract) {
        temple.description = data.extract.slice(0, 2000);
      }
    }

    await sleep(DELAY_MS);
  }

  // Fetch history and architecture sections individually
  let sectionCount = 0;
  for (const [title, temple] of titleToTemple) {
    sectionCount++;
    if (sectionCount % 10 === 0) {
      console.log(
        `  Fetching sections ${sectionCount} of ${titleToTemple.size}...`
      );
    }

    const sections = await fetchSections(title);
    if (sections.history) {
      temple.history = sections.history.slice(0, 3000);
    }
    if (sections.architecture) {
      temple.architectureNotes = sections.architecture.slice(0, 3000);
    }

    await sleep(DELAY_MS);
  }

  const outPath = join(dataDir, "temples-enriched.json");
  writeFileSync(outPath, JSON.stringify(temples, null, 2));

  const withDesc = temples.filter((t) => t.description);
  const withHistory = temples.filter((t) => t.history);
  const withArch = temples.filter((t) => t.architectureNotes);
  console.log(`\nDone! Wrote ${temples.length} temples to ${outPath}`);
  console.log(`  - ${withDesc.length} have descriptions`);
  console.log(`  - ${withHistory.length} have history sections`);
  console.log(`  - ${withArch.length} have architecture notes`);
}

main().catch(console.error);
