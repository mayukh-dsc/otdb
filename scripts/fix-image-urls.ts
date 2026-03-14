/**
 * Converts Wikimedia Special:FilePath URLs to direct upload.wikimedia.org thumbnail URLs.
 * Run with: npx tsx scripts/fix-image-urls.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface TempleData {
  imageUrl?: string;
  [key: string]: unknown;
}

function wikimediaThumbUrl(commonsUrl: string, width: number = 800): string {
  // Extract filename from Special:FilePath URL
  const match = commonsUrl.match(/Special:FilePath\/(.+)$/);
  if (!match) return commonsUrl;

  let filename = decodeURIComponent(match[1]);
  filename = filename.replace(/ /g, "_");

  const md5 = createHash("md5").update(filename).digest("hex");
  const a = md5[0];
  const ab = md5.slice(0, 2);

  const encodedFilename = encodeURIComponent(filename).replace(/%2F/g, "/");

  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${a}/${ab}/${encodedFilename}/${width}px-${encodedFilename}`;
}

function main() {
  const dataDir = join(__dirname, "..", "data");
  const temples: TempleData[] = JSON.parse(
    readFileSync(join(dataDir, "temples.json"), "utf-8")
  );

  let converted = 0;
  for (const t of temples) {
    if (t.imageUrl && t.imageUrl.includes("Special:FilePath")) {
      t.imageUrl = wikimediaThumbUrl(t.imageUrl);
      converted++;
    }
  }

  writeFileSync(join(dataDir, "temples.json"), JSON.stringify(temples, null, 2));
  console.log(`Converted ${converted} image URLs to direct thumbnail URLs`);

  // Print a few examples
  for (const t of temples.slice(0, 3)) {
    console.log(`  ${(t as any).name}: ${t.imageUrl?.slice(0, 120)}`);
  }
}

main();
