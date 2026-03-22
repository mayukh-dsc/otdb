import type { Temple, TempleSummary } from "./types";

const blobBaseUrl =
  process.env.NEXT_PUBLIC_TEMPLE_IMAGE_BASE_URL?.replace(/\/+$/, "") ?? "";

function normalizeRemoteUrl(url?: string): string | undefined {
  if (!url) return undefined;
  return url.replace(/^http:/, "https:");
}

function unique(values: Array<string | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    if (!value) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

/**
 * Returns candidate image URLs in preference order:
 * 1) Blob/CDN URL (when NEXT_PUBLIC_TEMPLE_IMAGE_BASE_URL is configured)
 * 2) Local static image in /public/images/temples
 * 3) Remote source URL from temple data
 */
export function getTempleImageCandidates(
  templeId: string,
  remoteImageUrl?: string
): string[] {
  const blobUrl = blobBaseUrl ? `${blobBaseUrl}/temples/${templeId}.jpg` : undefined;
  const localUrl = `/images/temples/${templeId}.jpg`;
  const remoteUrl = normalizeRemoteUrl(remoteImageUrl);
  return unique([blobUrl, localUrl, remoteUrl]);
}

export function getTempleImageCandidatesFromTemple(temple: Temple | TempleSummary): string[] {
  return getTempleImageCandidates(temple.id, temple.imageUrl);
}

/**
 * Build a responsive srcSet string for blob-hosted images.
 * Falls back to empty string when blob URL is not configured.
 */
export function getTempleImageSrcSet(templeId: string): string {
  if (!blobBaseUrl) return "";

  const widths = [320, 640, 960];
  return widths
    .map((w) => `${blobBaseUrl}/temples/${templeId}.jpg?w=${w} ${w}w`)
    .join(", ");
}

export const TEMPLE_IMAGE_SIZES = "(max-width: 640px) 320px, (max-width: 1024px) 640px, 960px";
