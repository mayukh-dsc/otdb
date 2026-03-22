import type { Temple } from "./types";

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

export function getTempleImageCandidatesFromTemple(temple: Temple): string[] {
  return getTempleImageCandidates(temple.id, temple.imageUrl);
}

