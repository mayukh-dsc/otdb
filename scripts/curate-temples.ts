/**
 * Curation script: filters raw temple data to the most significant temples,
 * then enriches only those from Wikipedia.
 *
 * Run with: npx tsx scripts/curate-temples.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WIKI_API = "https://en.wikipedia.org/w/api.php";
const DELAY_MS = 300;

interface RawTemple {
  id: string;
  name: string;
  alternateName?: string;
  latitude: number;
  longitude: number;
  yearBuilt: number;
  yearBuiltApproximate: boolean;
  deity?: string;
  religion: string;
  architecturalStyle?: string;
  dynasty?: string;
  commissionedBy?: string;
  material?: string;
  heightMeters?: number;
  heritageStatus?: string;
  partOfComplex?: string;
  description: string;
  history?: string;
  architectureNotes?: string;
  significance?: string;
  imageUrl?: string;
  wikipediaUrl?: string;
  wikidataId: string;
  country: string;
  state?: string;
  currentCondition?: string;
}

// Well-known significant temples to always include (by Wikidata ID)
const MUST_INCLUDE = new Set([
  "Q192925", // Angkor Wat
  "Q464916", // Brihadeshwara Temple
  "Q170495", // Khajuraho
  "Q213352", // Shore Temple
  "Q742689", // Kailasa Temple (Ellora)
  "Q200127", // Konark Sun Temple
  "Q693038", // Meenakshi Temple
  "Q845178", // Ranganathaswamy Temple
  "Q671969", // Jagannath Temple Puri
  "Q273992", // Somnath Temple
  "Q26717",  // Taj Mahal (not a temple but iconic)
  "Q217013", // Virupaksha Temple
  "Q751786", // Brihadeeswarar Temple Gangaikonda
  "Q1753509",// Airavatesvara Temple
  "Q274637", // Thanjavur Brihadeeswarar
  "Q1424545",// Lepakshi temple
  "Q1644573",// Modhera Sun Temple
  "Q11813451",// Prambanan
  "Q627293", // Borobudur
  "Q221345", // My Son (Vietnam)
  "Q1090160",// Preah Vihear
  "Q428518", // Bayon
  "Q834588", // Banteay Srei
  "Q7155",   // Angkor Thom
  "Q220327", // Ta Prohm
  "Q756834", // Bagan temples
  "Q3856",   // Shwedagon Pagoda
  "Q722093", // Ananda Temple
  "Q269613", // Pashupatinath
  "Q623578", // Changu Narayan
  "Q283200", // Mahabodhi Temple
  "Q1370596",// Vitthala Temple
  "Q1534753",// Hazara Rama Temple
  "Q766759", // Ramanathaswamy Temple
  "Q474814", // Dilwara Temples
  "Q3553217",// Kandariya Mahadeva
  "Q1643658",// Lakshmana Temple
  "Q1150897",// Lingaraja Temple
  "Q7385572",// Mukteshwar Temple
  "Q2469740",// Parasurameswara Temple
  "Q3552983",// Dashavatara Temple Deogarh
  "Q1768050",// Mahabalipuram Rathas
  "Q15262248",// Varaha Cave Temple
  "Q1335049",// Durga Temple Aihole
  "Q1249543",// Badami Cave Temples
  "Q3894062",// Pattadakal temples
  "Q723360", // Hampi
  "Q1752876",// Sas-Bahu Temple
  "Q570116", // Sanchi
  "Q2543933",// Martand Sun Temple
]);

function scoreTemple(t: RawTemple): number {
  let score = 0;
  if (MUST_INCLUDE.has(t.wikidataId)) score += 1000;
  if (t.yearBuilt !== 0) score += 30;
  if (t.wikipediaUrl) score += 25;
  if (t.imageUrl) score += 15;
  if (t.heritageStatus) score += 20;
  if (t.architecturalStyle) score += 10;
  if (t.commissionedBy) score += 10;
  if (t.material) score += 5;
  if (t.heightMeters) score += 5;
  if (t.partOfComplex) score += 5;
  // Prefer older temples
  if (t.yearBuilt !== 0 && t.yearBuilt < 500) score += 15;
  if (t.yearBuilt !== 0 && t.yearBuilt < 0) score += 10;
  return score;
}

function extractTitleFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.pathname.startsWith("/wiki/")) {
      return decodeURIComponent(u.pathname.slice(6));
    }
  } catch {
    // ignore
  }
  return null;
}

async function fetchSummaries(
  titles: string[]
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  const params = new URLSearchParams({
    action: "query",
    prop: "extracts",
    exintro: "1",
    explaintext: "1",
    titles: titles.join("|"),
    format: "json",
    redirects: "1",
  });

  const res = await fetch(`${WIKI_API}?${params}`, {
    headers: { "User-Agent": "OTDB-TempleDatabase/1.0 (educational project)" },
  });
  if (!res.ok) return results;
  const data = await res.json();
  const pages = data.query?.pages;
  if (!pages) return results;

  for (const pageId of Object.keys(pages)) {
    const page = pages[pageId];
    if (page.extract && page.title) {
      results.set(page.title, page.extract);
    }
  }
  return results;
}

async function fetchSections(
  title: string
): Promise<{ history?: string; architecture?: string }> {
  const paramsIdx = new URLSearchParams({
    action: "parse",
    page: title,
    prop: "sections",
    format: "json",
    redirects: "1",
  });

  const res = await fetch(`${WIKI_API}?${paramsIdx}`, {
    headers: { "User-Agent": "OTDB-TempleDatabase/1.0 (educational project)" },
  });
  if (!res.ok) return {};

  const data = await res.json();
  const sections = data.parse?.sections;
  if (!sections) return {};

  let historyIdx: string | null = null;
  let archIdx: string | null = null;

  for (const s of sections) {
    const line = (s.line as string).toLowerCase();
    if (!historyIdx && line.includes("history")) historyIdx = s.index;
    if (
      !archIdx &&
      (line.includes("architecture") ||
        line.includes("structure") ||
        line.includes("layout"))
    )
      archIdx = s.index;
  }

  const result: { history?: string; architecture?: string } = {};

  for (const [idx, key] of [
    [historyIdx, "history"],
    [archIdx, "architecture"],
  ] as const) {
    if (!idx) continue;
    const p = new URLSearchParams({
      action: "parse",
      page: title,
      prop: "wikitext",
      section: idx,
      format: "json",
      redirects: "1",
    });
    const r = await fetch(`${WIKI_API}?${p}`, {
      headers: {
        "User-Agent": "OTDB-TempleDatabase/1.0 (educational project)",
      },
    });
    if (!r.ok) continue;
    const d = await r.json();
    const wikitext: string | undefined = d.parse?.wikitext?.["*"];
    if (wikitext) {
      result[key] = cleanWikitext(wikitext).slice(0, 3000);
    }
  }

  return result;
}

function cleanWikitext(text: string): string {
  return text
    .replace(/<ref[^>]*\/>/g, "")
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\[\[(?:File|Image):[^\]]*\]\]/gi, "")
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, "$1")
    .replace(/\{\{[^}]*\}\}/g, "")
    .replace(/^=+\s*.*?\s*=+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const dataDir = join(__dirname, "..", "data");
  const raw: RawTemple[] = JSON.parse(
    readFileSync(join(dataDir, "temples-raw.json"), "utf-8")
  );

  console.log(`Loaded ${raw.length} raw temples`);

  // Score and sort
  const scored = raw.map((t) => ({ temple: t, score: scoreTemple(t) }));
  scored.sort((a, b) => b.score - a.score);

  // Take top ~200 (or all must-includes + top scored)
  const selected = scored.slice(0, 200).map((s) => s.temple);
  console.log(`Selected top ${selected.length} temples by significance score`);

  // Enrich from Wikipedia
  const withWiki = selected.filter((t) => t.wikipediaUrl);
  console.log(`${withWiki.length} have Wikipedia articles — enriching...`);

  const titleToTemple = new Map<string, RawTemple>();
  for (const t of withWiki) {
    const title = extractTitleFromUrl(t.wikipediaUrl!);
    if (title) titleToTemple.set(title, t);
  }

  const allTitles = Array.from(titleToTemple.keys());

  // Summaries in batches of 20
  for (let i = 0; i < allTitles.length; i += 20) {
    const batch = allTitles.slice(i, i + 20);
    console.log(
      `  Summaries ${i + 1}-${Math.min(i + 20, allTitles.length)} of ${allTitles.length}...`
    );
    const summaries = await fetchSummaries(batch);
    for (const [title, extract] of summaries) {
      const temple = titleToTemple.get(title);
      if (temple) temple.description = extract.slice(0, 2000);
    }
    await sleep(DELAY_MS);
  }

  // Sections individually
  let count = 0;
  for (const [title, temple] of titleToTemple) {
    count++;
    if (count % 20 === 0)
      console.log(`  Sections ${count} of ${titleToTemple.size}...`);
    const sections = await fetchSections(title);
    if (sections.history) temple.history = sections.history;
    if (sections.architecture) temple.architectureNotes = sections.architecture;
    await sleep(DELAY_MS);
  }

  const outPath = join(dataDir, "temples.json");
  writeFileSync(outPath, JSON.stringify(selected, null, 2));

  const stats = {
    total: selected.length,
    withDates: selected.filter((t) => t.yearBuilt !== 0).length,
    withImages: selected.filter((t) => t.imageUrl).length,
    withDescriptions: selected.filter((t) => t.description).length,
    withHistory: selected.filter((t) => t.history).length,
    withArchNotes: selected.filter((t) => t.architectureNotes).length,
    byCountry: {} as Record<string, number>,
  };
  for (const t of selected) {
    stats.byCountry[t.country] = (stats.byCountry[t.country] || 0) + 1;
  }

  console.log(`\nWrote ${selected.length} curated temples to ${outPath}`);
  console.log(JSON.stringify(stats, null, 2));
}

main().catch(console.error);
