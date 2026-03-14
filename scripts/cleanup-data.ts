/**
 * Cleanup script: removes churches/cathedrals (out of scope) and fixes remaining religion issues.
 * Run with: npx tsx scripts/cleanup-data.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface TempleData {
  name: string;
  religion: string;
  description?: string;
  [key: string]: unknown;
}

const EXCLUDE_KEYWORDS = [
  "church",
  "cathedral",
  "basilica",
  "chapel",
  "mosque",
  "synagogue",
  "dargah",
  "mausoleum",
  "tomb",
  "fort",
  "palace",
];

function shouldExclude(t: TempleData): boolean {
  const name = t.name.toLowerCase();
  const desc = (t.description || "").toLowerCase().slice(0, 200);

  for (const kw of EXCLUDE_KEYWORDS) {
    if (name.includes(kw)) return true;
  }

  // Christian buildings that slipped through
  if (
    desc.includes("catholic") ||
    desc.includes("protestant") ||
    desc.includes("anglican") ||
    desc.includes("armenian church") ||
    desc.includes("cnr church")
  ) {
    return true;
  }

  return false;
}

function main() {
  const dataDir = join(__dirname, "..", "data");
  const temples: TempleData[] = JSON.parse(
    readFileSync(join(dataDir, "temples.json"), "utf-8")
  );

  console.log(`Starting with ${temples.length} temples`);

  const excluded: string[] = [];
  const kept = temples.filter((t) => {
    if (shouldExclude(t)) {
      excluded.push(t.name);
      return false;
    }
    return true;
  });

  // Fix remaining "Other" to "Hindu" if they are clearly temples
  for (const t of kept) {
    if (t.religion === "Other") {
      const name = t.name.toLowerCase();
      if (
        name.includes("temple") ||
        name.includes("mandir") ||
        name.includes("kovil")
      ) {
        t.religion = "Hindu";
      }
    }
  }

  console.log(`Excluded ${excluded.length} non-temple buildings:`);
  for (const name of excluded) {
    console.log(`  - ${name}`);
  }

  console.log(`\nKeeping ${kept.length} temples`);

  const religions: Record<string, number> = {};
  for (const t of kept) {
    religions[t.religion] = (religions[t.religion] || 0) + 1;
  }
  console.log("Religion distribution:", religions);

  writeFileSync(join(dataDir, "temples.json"), JSON.stringify(kept, null, 2));
}

main();
