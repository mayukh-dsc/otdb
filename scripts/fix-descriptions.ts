/**
 * Fix script: re-fetches Wikipedia descriptions for temples missing them.
 * Run with: npx tsx scripts/fix-descriptions.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WIKI_API = "https://en.wikipedia.org/w/api.php";
const DELAY_MS = 200;

interface TempleData {
  name: string;
  description: string;
  wikipediaUrl?: string;
  [key: string]: unknown;
}

function extractTitleFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.pathname.startsWith("/wiki/")) {
      return decodeURIComponent(u.pathname.slice(6));
    }
  } catch {
    // ignore
  }
  return null;
}

async function fetchSummary(title: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: "query",
    prop: "extracts",
    exintro: "1",
    explaintext: "1",
    titles: title,
    format: "json",
    redirects: "1",
  });

  const res = await fetch(`${WIKI_API}?${params}`, {
    headers: { "User-Agent": "OTDB-TempleDatabase/1.0 (educational project)" },
  });
  if (!res.ok) return null;

  const data = await res.json();
  const pages = data.query?.pages;
  if (!pages) return null;

  for (const pageId of Object.keys(pages)) {
    const page = pages[pageId];
    if (page.extract) return page.extract;
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const dataDir = join(__dirname, "..", "data");
  const temples: TempleData[] = JSON.parse(
    readFileSync(join(dataDir, "temples.json"), "utf-8")
  );

  const needDesc = temples.filter((t) => !t.description && t.wikipediaUrl);
  console.log(
    `${needDesc.length} temples need descriptions (of ${temples.length} total)`
  );

  let fixed = 0;
  for (let i = 0; i < needDesc.length; i++) {
    const t = needDesc[i];
    const title = extractTitleFromUrl(t.wikipediaUrl!);
    if (!title) continue;

    const extract = await fetchSummary(title);
    if (extract) {
      t.description = extract.slice(0, 2000);
      fixed++;
    }

    if ((i + 1) % 20 === 0) {
      console.log(`  Processed ${i + 1} of ${needDesc.length}, fixed ${fixed}`);
    }
    await sleep(DELAY_MS);
  }

  writeFileSync(join(dataDir, "temples.json"), JSON.stringify(temples, null, 2));
  console.log(`\nDone. Fixed ${fixed} descriptions.`);
  console.log(
    `Total with descriptions: ${temples.filter((t) => t.description).length} / ${temples.length}`
  );
}

main().catch(console.error);
