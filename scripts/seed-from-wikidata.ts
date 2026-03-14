/**
 * One-time seed script: pulls temple data from Wikidata SPARQL endpoint.
 * Run with: npx tsx scripts/seed-from-wikidata.ts
 */

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";

const COUNTRIES: Record<string, string> = {
  Q668: "India",
  Q424: "Cambodia",
  Q252: "Indonesia",
  Q836: "Myanmar",
  Q869: "Thailand",
  Q881: "Vietnam",
  Q819: "Laos",
  Q854: "Sri Lanka",
  Q837: "Nepal",
};

const SPARQL_QUERY = `
SELECT DISTINCT
  ?temple ?templeLabel ?templeAltLabel
  ?coord
  ?inception
  ?styleLabel
  ?religionLabel
  ?heritageLabel
  ?image
  ?creatorLabel
  ?namedAfterLabel
  ?materialLabel
  ?height
  ?partOfLabel
  ?countryLabel
  ?adminLabel
  ?article
  ?deityLabel
WHERE {
  ?temple wdt:P31/wdt:P279* wd:Q44539.
  ?temple wdt:P17 ?country.
  VALUES ?country {
    wd:Q668 wd:Q424 wd:Q252 wd:Q836
    wd:Q869 wd:Q881 wd:Q819 wd:Q854 wd:Q837
  }
  ?temple wdt:P625 ?coord.

  OPTIONAL { ?temple wdt:P571 ?inception. }
  OPTIONAL { ?temple wdt:P149 ?style. }
  OPTIONAL { ?temple wdt:P140 ?religion. }
  OPTIONAL { ?temple wdt:P1435 ?heritage. }
  OPTIONAL { ?temple wdt:P18 ?image. }
  OPTIONAL { ?temple wdt:P170 ?creator. }
  OPTIONAL { ?temple wdt:P138 ?namedAfter. }
  OPTIONAL { ?temple wdt:P186 ?material. }
  OPTIONAL { ?temple wdt:P2048 ?height. }
  OPTIONAL { ?temple wdt:P361 ?partOf. }
  OPTIONAL { ?temple wdt:P131 ?admin. }
  OPTIONAL { ?temple wdt:P825 ?deity. }
  OPTIONAL {
    ?article schema:about ?temple.
    ?article schema:isPartOf <https://en.wikipedia.org/>.
  }

  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
`;

interface RawBinding {
  [key: string]: { type: string; value: string } | undefined;
}

interface RawTemple {
  id: string;
  name: string;
  alternateName?: string;
  latitude: number;
  longitude: number;
  yearBuilt?: number;
  architecturalStyle?: string;
  religion?: string;
  heritageStatus?: string;
  imageUrl?: string;
  commissionedBy?: string;
  deity?: string;
  material?: string;
  heightMeters?: number;
  partOfComplex?: string;
  country?: string;
  state?: string;
  wikipediaUrl?: string;
  wikidataId: string;
}

function parseCoord(point: string): { lat: number; lng: number } | null {
  const match = point.match(/Point\(([-\d.]+)\s+([-\d.]+)\)/);
  if (!match) return null;
  return { lat: parseFloat(match[2]), lng: parseFloat(match[1]) };
}

function parseYear(dateStr: string): number | null {
  const match = dateStr.match(/^(-?\d{4})/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

function val(binding: RawBinding, key: string): string | undefined {
  return binding[key]?.value;
}

function extractWikidataId(uri: string): string {
  return uri.split("/").pop() || uri;
}

async function fetchSparql(): Promise<RawBinding[]> {
  const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(SPARQL_QUERY)}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/sparql-results+json",
      "User-Agent": "OTDB-TempleDatabase/1.0 (educational project)",
    },
  });

  if (!res.ok) {
    throw new Error(`SPARQL query failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.results.bindings;
}

function deduplicateBindings(bindings: RawBinding[]): Map<string, RawTemple> {
  const temples = new Map<string, RawTemple>();

  for (const b of bindings) {
    const uri = val(b, "temple");
    if (!uri) continue;

    const wikidataId = extractWikidataId(uri);
    const coord = val(b, "coord");
    if (!coord) continue;

    const parsed = parseCoord(coord);
    if (!parsed) continue;

    const existing = temples.get(wikidataId);

    if (!existing) {
      const inception = val(b, "inception");
      const height = val(b, "height");

      temples.set(wikidataId, {
        id: wikidataId.toLowerCase(),
        name: val(b, "templeLabel") || wikidataId,
        alternateName: val(b, "templeAltLabel"),
        latitude: parsed.lat,
        longitude: parsed.lng,
        yearBuilt: inception ? (parseYear(inception) ?? undefined) : undefined,
        architecturalStyle: val(b, "styleLabel"),
        religion: val(b, "religionLabel"),
        heritageStatus: val(b, "heritageLabel"),
        imageUrl: val(b, "image"),
        commissionedBy: val(b, "creatorLabel"),
        deity: val(b, "deityLabel"),
        material: val(b, "materialLabel"),
        heightMeters: height ? parseFloat(height) : undefined,
        partOfComplex: val(b, "partOfLabel"),
        country: val(b, "countryLabel"),
        state: val(b, "adminLabel"),
        wikipediaUrl: val(b, "article"),
        wikidataId,
      });
    } else {
      if (!existing.architecturalStyle && val(b, "styleLabel"))
        existing.architecturalStyle = val(b, "styleLabel");
      if (!existing.religion && val(b, "religionLabel"))
        existing.religion = val(b, "religionLabel");
      if (!existing.heritageStatus && val(b, "heritageLabel"))
        existing.heritageStatus = val(b, "heritageLabel");
      if (!existing.imageUrl && val(b, "image"))
        existing.imageUrl = val(b, "image");
      if (!existing.commissionedBy && val(b, "creatorLabel"))
        existing.commissionedBy = val(b, "creatorLabel");
      if (!existing.material && val(b, "materialLabel"))
        existing.material = val(b, "materialLabel");
      if (!existing.yearBuilt && val(b, "inception")) {
        const y = parseYear(val(b, "inception")!);
        if (y !== null) existing.yearBuilt = y;
      }
      if (!existing.wikipediaUrl && val(b, "article"))
        existing.wikipediaUrl = val(b, "article");
      if (!existing.deity && val(b, "deityLabel"))
        existing.deity = val(b, "deityLabel");
    }
  }

  return temples;
}

function normalizeReligion(
  r?: string
): "Hindu" | "Buddhist" | "Jain" | "Other" {
  if (!r) return "Other";
  const lower = r.toLowerCase();
  if (lower.includes("hindu") || lower.includes("shaiv") || lower.includes("vaishna"))
    return "Hindu";
  if (lower.includes("buddh")) return "Buddhist";
  if (lower.includes("jain")) return "Jain";
  return "Other";
}

async function main() {
  console.log("Fetching temple data from Wikidata...");
  const bindings = await fetchSparql();
  console.log(`Got ${bindings.length} raw bindings`);

  const templeMap = deduplicateBindings(bindings);
  console.log(`Deduplicated to ${templeMap.size} unique temples`);

  const temples = Array.from(templeMap.values()).map((t) => ({
    id: t.id,
    name: t.name,
    alternateName: t.alternateName || undefined,
    latitude: t.latitude,
    longitude: t.longitude,
    yearBuilt: t.yearBuilt ?? 0,
    yearBuiltApproximate: !t.yearBuilt,
    deity: t.deity || undefined,
    religion: normalizeReligion(t.religion),
    architecturalStyle: t.architecturalStyle || undefined,
    dynasty: undefined as string | undefined,
    commissionedBy: t.commissionedBy || undefined,
    material: t.material || undefined,
    heightMeters: t.heightMeters || undefined,
    heritageStatus: t.heritageStatus || undefined,
    partOfComplex: t.partOfComplex || undefined,
    description: "",
    imageUrl: t.imageUrl || undefined,
    wikipediaUrl: t.wikipediaUrl || undefined,
    wikidataId: t.wikidataId,
    country: t.country || "Unknown",
    state: t.state || undefined,
    currentCondition: undefined as string | undefined,
  }));

  const { writeFileSync, mkdirSync } = await import("fs");
  const { join, dirname } = await import("path");
  const { fileURLToPath } = await import("url");

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const outDir = join(__dirname, "..", "data");
  mkdirSync(outDir, { recursive: true });

  const outPath = join(outDir, "temples-raw.json");
  writeFileSync(outPath, JSON.stringify(temples, null, 2));
  console.log(`Wrote ${temples.length} temples to ${outPath}`);

  const withDates = temples.filter((t) => t.yearBuilt !== 0);
  console.log(`  - ${withDates.length} have construction dates`);
  const withImages = temples.filter((t) => t.imageUrl);
  console.log(`  - ${withImages.length} have images`);
  const withWiki = temples.filter((t) => t.wikipediaUrl);
  console.log(`  - ${withWiki.length} have Wikipedia articles`);

  const byCountry: Record<string, number> = {};
  for (const t of temples) {
    byCountry[t.country] = (byCountry[t.country] || 0) + 1;
  }
  console.log("  By country:", byCountry);
}

main().catch(console.error);
