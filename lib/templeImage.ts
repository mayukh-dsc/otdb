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
 * 2) Without Blob: in development, local /public/images/temples first (downloaded assets).
 *    In production, remote URL first — static files are not deployed on Vercel (gitignored),
 *    so trying local only causes 404s before Wikimedia fallback.
 * 3) Remaining fallbacks (local and/or remote)
 */
export function getTempleImageCandidates(
  templeId: string,
  remoteImageUrl?: string
): string[] {
  const blobUrl = blobBaseUrl ? `${blobBaseUrl}/temples/${templeId}.jpg` : undefined;
  const localUrl = `/images/temples/${templeId}.jpg`;
  const remoteUrl = normalizeRemoteUrl(remoteImageUrl);

  if (blobBaseUrl) {
    return unique([blobUrl, localUrl, remoteUrl]);
  }

  if (process.env.NODE_ENV === "development") {
    return unique([localUrl, remoteUrl]);
  }
  return unique([remoteUrl, localUrl]);
}

export function getTempleImageCandidatesFromTemple(temple: Temple): string[] {
  return getTempleImageCandidates(temple.id, temple.imageUrl);
}

