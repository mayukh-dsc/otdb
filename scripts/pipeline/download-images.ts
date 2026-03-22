/**
 * Downloads temple images from Wikimedia to public/images/temples/<id>.jpg
 * Rate-limited to avoid 429s. Idempotent — skips existing files.
 *
 * Usage: npx tsx scripts/pipeline/download-images.ts [--force]
 */

import { mkdirSync, existsSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const OUT_DIR = join(ROOT, "public", "images", "temples");
const DB_PATH = join(ROOT, "data", "temples.db");
const JSON_PATH = join(ROOT, "data", "temples.json");

const DELAY_MS = 600;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

interface TempleEntry {
  id: string;
  name: string;
  imageUrl?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function getExtension(url: string): string {
  const match = url.match(/\.(jpe?g|png|gif|webp)/i);
  return match ? match[0].toLowerCase() : ".jpg";
}

async function downloadFile(
  url: string,
  dest: string,
  retries = MAX_RETRIES
): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "OTDB-ImageDownloader/1.0 (https://github.com/otdb; educational project)",
          Accept: "image/*",
        },
        redirect: "follow",
      });

      if (res.status === 429) {
        const wait = RETRY_DELAY_MS * attempt;
        console.warn(`  429 rate-limited, waiting ${wait}ms (attempt ${attempt}/${retries})`);
        await sleep(wait);
        continue;
      }

      if (!res.ok) {
        console.warn(`  HTTP ${res.status} for ${url}`);
        return false;
      }

      const buffer = Buffer.from(await res.arrayBuffer());
      writeFileSync(dest, buffer);
      return true;
    } catch (err) {
      if (attempt < retries) {
        await sleep(RETRY_DELAY_MS * attempt);
      } else {
        console.warn(`  Failed after ${retries} attempts:`, err instanceof Error ? err.message : err);
        return false;
      }
    }
  }
  return false;
}

async function loadTemples(): Promise<TempleEntry[]> {
  // Try SQLite first (pipeline dev environment), fall back to JSON
  try {
    const Database = (await import("better-sqlite3")).default;
    if (existsSync(DB_PATH)) {
      const db = new Database(DB_PATH, { readonly: true });
      const rows = db.prepare("SELECT id, name, image_url FROM temples").all() as Array<{
        id: string;
        name: string;
        image_url: string | null;
      }>;
      db.close();
      return rows.map((r) => ({ id: r.id, name: r.name, imageUrl: r.image_url ?? undefined }));
    }
  } catch {
    // better-sqlite3 not available, use JSON
  }

  if (existsSync(JSON_PATH)) {
    const { readFileSync } = await import("fs");
    const data = JSON.parse(readFileSync(JSON_PATH, "utf-8")) as TempleEntry[];
    return data;
  }

  throw new Error("No data source found. Need either data/temples.db or data/temples.json");
}

async function main() {
  const force = process.argv.includes("--force");

  mkdirSync(OUT_DIR, { recursive: true });

  const temples = await loadTemples();
  const withImages = temples.filter((t) => t.imageUrl);

  console.log(`Download images: ${withImages.length} temples with URLs`);
  if (force) console.log("  --force: re-downloading all");

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const temple of withImages) {
    const ext = getExtension(temple.imageUrl!);
    const filename = `${temple.id}${ext}`;
    const dest = join(OUT_DIR, filename);

    if (!force && existsSync(dest)) {
      skipped++;
      continue;
    }

    await sleep(DELAY_MS);

    const ok = await downloadFile(temple.imageUrl!, dest);
    if (ok) {
      downloaded++;
      process.stdout.write(`  [${downloaded + skipped}/${withImages.length}] ${temple.name}\n`);
    } else {
      failed++;
      console.warn(`  FAILED: ${temple.name} (${temple.imageUrl})`);
    }
  }

  console.log(`\nDone: ${downloaded} downloaded, ${skipped} skipped, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
