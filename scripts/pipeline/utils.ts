import { PIPELINE_CONFIG } from "./config.js";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry(
  url: string,
  options: {
    retries?: number;
    delayMs?: number;
    headers?: Record<string, string>;
  } = {}
): Promise<Response> {
  const { retries = 3, delayMs = 1000, headers = {} } = options;
  const allHeaders = {
    "User-Agent": PIPELINE_CONFIG.userAgent,
    ...headers,
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: allHeaders });
      if (res.ok) return res;

      if (res.status === 429 || res.status >= 500) {
        if (attempt < retries) {
          const wait = delayMs * Math.pow(2, attempt);
          console.warn(
            `  Retry ${attempt + 1}/${retries} for ${url} (status ${res.status}), waiting ${wait}ms`
          );
          await sleep(wait);
          continue;
        }
      }
      throw new Error(`HTTP ${res.status} for ${url}`);
    } catch (err) {
      if (attempt < retries) {
        const wait = delayMs * Math.pow(2, attempt);
        console.warn(
          `  Retry ${attempt + 1}/${retries} for ${url} (${err instanceof Error ? err.message : err}), waiting ${wait}ms`
        );
        await sleep(wait);
        continue;
      }
      throw err;
    }
  }

  throw new Error(`All ${retries} retries exhausted for ${url}`);
}

export function createRateLimiter(delayMs: number) {
  let lastCall = 0;
  return async () => {
    const now = Date.now();
    const elapsed = now - lastCall;
    if (elapsed < delayMs) {
      await sleep(delayMs - elapsed);
    }
    lastCall = Date.now();
  };
}

export function cleanWikitext(text: string): string {
  return (
    text
      .replace(/<ref[^>]*\/>/g, "")
      .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\[\[(?:File|Image):[^\]]*\]\]/gi, "")
      .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, "$1")
      .replace(/\{\{[^}]*\}\}/g, "")
      .replace(/^=+\s*.*?\s*=+$/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

/**
 * Simple fuzzy match: normalizes both strings and checks if one contains the other
 * or if they share enough words. Returns a score from 0 to 1.
 */
export function fuzzyMatch(a: string, b: string): number {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const na = normalize(a);
  const nb = normalize(b);

  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.8;

  const wordsA = new Set(na.split(" "));
  const wordsB = new Set(nb.split(" "));
  const intersection = [...wordsA].filter((w) => wordsB.has(w));
  const union = new Set([...wordsA, ...wordsB]);

  if (union.size === 0) return 0;
  return intersection.length / union.size;
}

/**
 * Merge incoming data into existing data. Higher-priority sources
 * don't get overwritten by lower-priority sources.
 */
export function mergeSafe<T extends Record<string, unknown>>(
  existing: T | null,
  incoming: Partial<T>,
  _sourcePriority: number
): T {
  if (!existing) return incoming as T;

  const result = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    if (value !== null && value !== undefined) {
      const existingVal = result[key as keyof T];
      if (
        existingVal === null ||
        existingVal === undefined ||
        existingVal === ""
      ) {
        (result as Record<string, unknown>)[key] = value;
      }
    }
  }
  return result;
}

export function nowISO(): string {
  return new Date().toISOString();
}
