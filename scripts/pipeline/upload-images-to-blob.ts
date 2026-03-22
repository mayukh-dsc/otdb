/**
 * Uploads temple images from public/images/temples to Vercel Blob.
 *
 * Requirements:
 * - BLOB_READ_WRITE_TOKEN must be set in environment
 * - Images should already exist locally (run download-images first)
 *
 * Usage:
 *   npx tsx scripts/pipeline/upload-images-to-blob.ts
 */

import { readdirSync, readFileSync, statSync } from "fs";
import { join, dirname, extname } from "path";
import { fileURLToPath } from "url";
import { put } from "@vercel/blob";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const IMAGE_DIR = join(ROOT, "public", "images", "temples");

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mimeFromExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    default:
      return "application/octet-stream";
  }
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("Missing BLOB_READ_WRITE_TOKEN");
  }

  const entries = readdirSync(IMAGE_DIR).filter((name) => {
    const full = join(IMAGE_DIR, name);
    return statSync(full).isFile();
  });

  if (entries.length === 0) {
    console.log("No images found in public/images/temples");
    return;
  }

  console.log(`Uploading ${entries.length} temple images to Vercel Blob...`);

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;
  let firstBlobUrl: string | null = null;

  for (const fileName of entries) {
    const fullPath = join(IMAGE_DIR, fileName);
    const file = readFileSync(fullPath);
    const ext = extname(fileName);
    const contentType = mimeFromExt(ext);
    const blobPath = `temples/${fileName}`;

    try {
      const result = await put(blobPath, file, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
        addRandomSuffix: false,
        contentType,
      });

      uploaded++;
      if (!firstBlobUrl) firstBlobUrl = result.url;
      process.stdout.write(`  [${uploaded + skipped + failed}/${entries.length}] uploaded ${fileName}\n`);
      await sleep(100);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.toLowerCase().includes("already exists")) {
        skipped++;
        process.stdout.write(`  [${uploaded + skipped + failed}/${entries.length}] skipped ${fileName} (exists)\n`);
      } else {
        failed++;
        process.stdout.write(`  [${uploaded + skipped + failed}/${entries.length}] failed ${fileName}: ${message}\n`);
      }
    }
  }

  console.log(`\nDone: ${uploaded} uploaded, ${skipped} skipped, ${failed} failed`);
  if (firstBlobUrl) {
    const base = firstBlobUrl.replace(/\/temples\/[^/]+$/, "");
    console.log(`Set NEXT_PUBLIC_TEMPLE_IMAGE_BASE_URL=${base}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

