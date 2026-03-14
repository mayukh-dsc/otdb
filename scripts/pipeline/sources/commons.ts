/**
 * Commons source: searches Wikimedia Commons for floor plans, cross-sections,
 * and elevations of temples. Stores results in the visualization JSON column.
 */

import { openDb, getAllTemples, getTemple, upsertTemple } from "../db.js";
import type { TempleRow } from "../db.js";
import { fetchWithRetry, createRateLimiter, nowISO } from "../utils.js";
import type { TempleVisualization, ImageRef } from "../../../lib/types.js";

const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const RATE_LIMIT_MS = 300;

const SEARCH_QUERIES: { query: string; key: keyof Pick<TempleVisualization, "floorPlanUrls" | "crossSectionUrls" | "elevationUrls"> }[] = [
  { query: "floor plan", key: "floorPlanUrls" },
  { query: "cross section", key: "crossSectionUrls" },
  { query: "elevation", key: "elevationUrls" },
];

interface CommonsImageInfo {
  url?: string;
  descriptionurl?: string;
  extmetadata?: {
    ObjectName?: { value?: string };
    ImageDescription?: { value?: string };
  };
}

interface CommonsPage {
  pageid?: number;
  title?: string;
  imageinfo?: CommonsImageInfo[];
}

interface CommonsQueryResponse {
  query?: { pages?: Record<string, CommonsPage> };
  error?: { code?: string; info?: string };
}

function toImageRef(info: CommonsImageInfo, commonsUrl: string): ImageRef {
  const url = info.url ?? "";
  const caption =
    info.extmetadata?.ObjectName?.value ??
    info.extmetadata?.ImageDescription?.value?.slice(0, 200);
  return {
    url,
    caption: caption ? caption.slice(0, 300) : undefined,
    attribution: {
      source: "commons",
      url: info.descriptionurl ?? commonsUrl,
      fetchedAt: nowISO(),
    },
  };
}

async function searchCommons(
  query: string,
  limit: number = 10
): Promise<ImageRef[]> {
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: `File:${query}`,
    gsrnamespace: "6",
    gsrlimit: String(limit),
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiextmetadatafilter: "ObjectName|ImageDescription",
    format: "json",
    origin: "*",
  });
  const url = `${COMMONS_API}?${params.toString()}`;
  const res = await fetchWithRetry(url);
  const data = (await res.json()) as CommonsQueryResponse;

  if (data.error || !data.query?.pages) {
    return [];
  }

  const refs: ImageRef[] = [];
  const seen = new Set<string>();

  for (const page of Object.values(data.query.pages)) {
    const info = page.imageinfo?.[0];
    if (!info?.url) continue;
    if (seen.has(info.url)) continue;
    seen.add(info.url);
    const fileTitle = page.title ?? "File:unknown";
    const commonsUrl = `https://commons.wikimedia.org/wiki/${encodeURIComponent(fileTitle)}`;
    refs.push(toImageRef(info, commonsUrl));
  }
  return refs;
}

function dedupeByUrl(refs: ImageRef[]): ImageRef[] {
  const seen = new Set<string>();
  return refs.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
}

function mergeVisualization(
  existing: TempleVisualization | null,
  newRefs: Partial<
    Record<
      keyof Pick<
        TempleVisualization,
        "floorPlanUrls" | "crossSectionUrls" | "elevationUrls"
      >,
      ImageRef[]
    >
  >
): TempleVisualization {
  const base = existing ?? { available: false };
  const floorPlanUrls = dedupeByUrl([
    ...(base.floorPlanUrls ?? []),
    ...(newRefs.floorPlanUrls ?? []),
  ]);
  const crossSectionUrls = dedupeByUrl([
    ...(base.crossSectionUrls ?? []),
    ...(newRefs.crossSectionUrls ?? []),
  ]);
  const elevationUrls = dedupeByUrl([
    ...(base.elevationUrls ?? []),
    ...(newRefs.elevationUrls ?? []),
  ]);

  const hasAny =
    floorPlanUrls.length > 0 ||
    crossSectionUrls.length > 0 ||
    elevationUrls.length > 0;

  return {
    available: hasAny,
    floorPlanUrls: floorPlanUrls.length > 0 ? floorPlanUrls : undefined,
    crossSectionUrls:
      crossSectionUrls.length > 0 ? crossSectionUrls : undefined,
    elevationUrls: elevationUrls.length > 0 ? elevationUrls : undefined,
    interiorImageUrls: base.interiorImageUrls,
  };
}

export async function run(args: {
  temple?: string;
  force?: boolean;
  dryRun?: boolean;
}): Promise<number> {
  const db = openDb();
  const rateLimit = createRateLimiter(RATE_LIMIT_MS);

  let temples: TempleRow[];
  if (args.temple) {
    const t = getTemple(db, args.temple);
    temples = t ? [t] : [];
  } else {
    temples = getAllTemples(db);
  }

  console.log(`[commons] Processing ${temples.length} temples`);

  let updated = 0;

  for (const temple of temples) {
    try {
      const templeName = temple.name;
      const wikidataId = temple.wikidata_id ?? temple.id;
      const isQid = /^Q\d+$/i.test(wikidataId);

      const newRefs: Partial<
        Record<
          keyof Pick<TempleVisualization, "floorPlanUrls" | "crossSectionUrls" | "elevationUrls">,
          ImageRef[]
        >
      > = {};

      for (const { query, key } of SEARCH_QUERIES) {
        await rateLimit();

        const searchTerms = [`"${templeName}" ${query}`];
        if (isQid) {
          searchTerms.push(`"${wikidataId}" ${query}`);
        }

        for (const term of searchTerms) {
          const refs = await searchCommons(term, 5);
          if (refs.length > 0) {
            newRefs[key] = [...(newRefs[key] ?? []), ...refs];
          }
        }
      }

      const hasNew =
        (newRefs.floorPlanUrls?.length ?? 0) +
          (newRefs.crossSectionUrls?.length ?? 0) +
          (newRefs.elevationUrls?.length ?? 0) >
        0;

      if (!hasNew) continue;

      const existingViz = temple.visualization
        ? (JSON.parse(temple.visualization) as TempleVisualization)
        : null;
      const merged = mergeVisualization(existingViz, newRefs);

      if (args.dryRun) {
        console.log(
          `  [commons] Would update ${temple.id} (${temple.name}) - ${merged.floorPlanUrls?.length ?? 0} floor plans, ${merged.crossSectionUrls?.length ?? 0} cross-sections, ${merged.elevationUrls?.length ?? 0} elevations`
        );
        updated++;
        continue;
      }

      const updatedRow: TempleRow = {
        ...temple,
        visualization: JSON.stringify(merged),
        updated_at: nowISO(),
      };
      upsertTemple(db, updatedRow);
      console.log(
        `  [commons] Updated ${temple.id} (${temple.name}) - visualization.available = true`
      );
      updated++;
    } catch (err) {
      console.warn(
        `  [commons] Error processing ${temple.id}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  return updated;
}
