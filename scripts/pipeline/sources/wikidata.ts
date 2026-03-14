/**
 * Wikidata source: enriches temple data via SPARQL queries.
 * Fetches P186 (material), P2046 (area), P2048 (height), P5775 (interior image),
 * P361 (part of), P84 (architect), P149 (architectural style), P31 (instance of).
 */

import { openDb, upsertTemple, type TempleRow } from "../db.js";
import {
  fetchWithRetry,
  createRateLimiter,
  nowISO,
} from "../utils.js";
import type {
  TempleEngineering,
  TempleArchaeology,
  TempleVisualization,
  ImageRef,
} from "../../../lib/types.js";

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const BATCH_SIZE = 30;
const RATE_LIMIT_MS = 200;

/** SPARQL JSON binding value */
interface SparqlBinding {
  type: "uri" | "literal" | "bnode";
  value: string;
  "xml:lang"?: string;
  datatype?: string;
}

/** SPARQL JSON results format */
interface SparqlResults {
  head: { vars: string[] };
  results: { bindings: Record<string, SparqlBinding>[] };
}

/** Extracted wikidata enrichment per temple */
interface WikidataEnrichment {
  material?: string;
  area?: number;
  height?: number;
  interiorImageUrl?: string;
  partOf?: string;
  architect?: string;
  architecturalStyle?: string;
  instanceOf?: string;
}

function extractBindingValue(b: SparqlBinding | undefined): string | undefined {
  if (!b?.value || (b.type !== "uri" && b.type !== "literal")) return undefined;
  return b.value.trim() || undefined;
}

function extractQuantityAmount(b: SparqlBinding | undefined): number | undefined {
  if (!b || b.type !== "literal") return undefined;
  const n = Number.parseFloat(b.value);
  return Number.isFinite(n) ? n : undefined;
}

function parseSparqlResults(json: unknown): SparqlResults {
  if (
    !json ||
    typeof json !== "object" ||
    !("results" in json) ||
    !("head" in json)
  ) {
    throw new Error("Invalid SPARQL JSON response");
  }
  const obj = json as Record<string, unknown>;
  const head = obj.head as { vars: string[] };
  const results = obj.results as { bindings: Record<string, SparqlBinding>[] };
  if (!head?.vars || !Array.isArray(results?.bindings)) {
    throw new Error("Invalid SPARQL JSON structure");
  }
  return { head, results };
}

/** Build SPARQL query for a batch of QIDs */
function buildSparqlQuery(qids: string[]): string {
  const values = qids
    .map((q) => `wd:${q.replace(/^q/i, "Q")}`)
    .join(" ");
  return `
# en
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX p: <http://www.wikidata.org/prop/>
PREFIX psv: <http://www.wikidata.org/prop/statement/value/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?item ?material ?materialLabel ?area ?height ?interiorImage ?partOf ?partOfLabel ?architect ?architectLabel ?archStyle ?archStyleLabel ?instanceOf ?instanceOfLabel
WHERE {
  VALUES ?item { ${values} }
  OPTIONAL {
    ?item wdt:P186 ?material .
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". ?material rdfs:label ?materialLabel. }
  }
  OPTIONAL {
    ?item p:P2046/psv:P2046/wikibase:quantityAmount ?area .
  }
  OPTIONAL {
    ?item p:P2048/psv:P2048/wikibase:quantityAmount ?height .
  }
  OPTIONAL {
    ?item wdt:P5775 ?interiorImage .
  }
  OPTIONAL {
    ?item wdt:P361 ?partOf .
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". ?partOf rdfs:label ?partOfLabel. }
  }
  OPTIONAL {
    ?item wdt:P84 ?architect .
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". ?architect rdfs:label ?architectLabel. }
  }
  OPTIONAL {
    ?item wdt:P149 ?archStyle .
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". ?archStyle rdfs:label ?archStyleLabel. }
  }
  OPTIONAL {
    ?item wdt:P31 ?instanceOf .
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". ?instanceOf rdfs:label ?instanceOfLabel. }
  }
}
`;
}

/** Fetch and parse SPARQL results for a batch of QIDs */
async function fetchWikidataBatch(
  qids: string[],
  rateLimit: () => Promise<void>,
  fetchFn: typeof fetchWithRetry
): Promise<Map<string, WikidataEnrichment>> {
  if (qids.length === 0) return new Map();

  await rateLimit();

  const query = buildSparqlQuery(qids);
  const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}`;

  const res = await fetchFn(url, {
    headers: { Accept: "application/sparql-results+json" },
  });

  const json = (await res.json()) as unknown;
  const { results } = parseSparqlResults(json);

  const map = new Map<string, WikidataEnrichment>();

  function parseBindingToEnrichment(
    b: Record<string, SparqlBinding>
  ): { key: string; data: Partial<WikidataEnrichment> } | null {
    const itemRaw = b.item;
    if (!itemRaw?.value) return null;
    const match = /\/entity\/(Q\d+)$/i.exec(itemRaw.value);
    const qid = match?.[1]?.toUpperCase();
    if (!qid) return null;

    const material = extractBindingValue(b.materialLabel) ?? extractBindingValue(b.material);
    const partOf = extractBindingValue(b.partOfLabel) ?? extractBindingValue(b.partOf);
    const architect = extractBindingValue(b.architectLabel) ?? extractBindingValue(b.architect);
    const archStyle = extractBindingValue(b.archStyleLabel) ?? extractBindingValue(b.archStyle);
    const instanceOf = extractBindingValue(b.instanceOfLabel) ?? extractBindingValue(b.instanceOf);

    const data: Partial<WikidataEnrichment> = {};
    if (material) data.material = material;
    const area = extractQuantityAmount(b.area);
    if (area !== undefined) data.area = area;
    const height = extractQuantityAmount(b.height);
    if (height !== undefined) data.height = height;
    const interiorImage = extractBindingValue(b.interiorImage);
    if (interiorImage) data.interiorImageUrl = interiorImage;
    if (partOf) data.partOf = partOf;
    if (architect) data.architect = architect;
    if (archStyle) data.architecturalStyle = archStyle;
    if (instanceOf) data.instanceOf = instanceOf;

    return { key: qid.toLowerCase(), data };
  }

  for (const binding of results.bindings) {
    const enrichment = parseBindingToEnrichment(binding);
    if (!enrichment) continue;

    const key = enrichment.key;
    const existing = map.get(key) ?? ({} as WikidataEnrichment);
    Object.assign(existing, enrichment.data);
    map.set(key, existing);
  }

  return map;
}

function mergePlainColumns(row: TempleRow, e: WikidataEnrichment): Partial<TempleRow> {
  const out: Partial<TempleRow> = {};
  if (e.material && !row.material) out.material = e.material;
  if (e.height !== undefined && row.height_meters == null) out.height_meters = e.height;
  if (e.partOf && !row.part_of_complex) out.part_of_complex = e.partOf;
  if (e.architecturalStyle && !row.architectural_style) out.architectural_style = e.architecturalStyle;
  return out;
}

function mergeEngineeringJson(row: TempleRow, e: WikidataEnrichment): string | undefined {
  if (e.area === undefined) return undefined;
  const eng: TempleEngineering = row.engineering
    ? (JSON.parse(row.engineering) as TempleEngineering)
    : {};
  if (eng.totalArea != null) return undefined;
  eng.totalArea = e.area;
  return JSON.stringify(eng);
}

function mergeArchaeologyJson(row: TempleRow, e: WikidataEnrichment): string | undefined {
  if (!e.architect) return undefined;
  const arch: TempleArchaeology = row.archaeology
    ? (JSON.parse(row.archaeology) as TempleArchaeology)
    : {};
  if (arch.sthapati) return undefined;
  arch.sthapati = e.architect;
  return JSON.stringify(arch);
}

function mergeVisualizationJson(row: TempleRow, e: WikidataEnrichment): string | undefined {
  const newImgUrl = e.interiorImageUrl;
  if (!newImgUrl) return undefined;
  const viz: TempleVisualization = row.visualization
    ? (JSON.parse(row.visualization) as TempleVisualization)
    : { available: false };
  const urls = viz.interiorImageUrls ?? [];
  if (urls.some((u) => (typeof u === "string" ? u : u.url) === newImgUrl)) return undefined;
  const imageRef: ImageRef = {
    url: newImgUrl,
    attribution: {
      source: "wikidata",
      url: `https://www.wikidata.org/wiki/${row.wikidata_id ?? ""}`,
      fetchedAt: nowISO(),
    },
  };
  viz.interiorImageUrls = [...urls, imageRef];
  viz.available = true;
  return JSON.stringify(viz);
}

/** Merge enrichment into existing JSON and plain columns */
function mergeEnrichment(row: TempleRow, enrichment: WikidataEnrichment): TempleRow {
  const updated: TempleRow = { ...row, ...mergePlainColumns(row, enrichment) };

  const engJson = mergeEngineeringJson(row, enrichment);
  if (engJson) updated.engineering = engJson;

  const archJson = mergeArchaeologyJson(row, enrichment);
  if (archJson) updated.archaeology = archJson;

  const vizJson = mergeVisualizationJson(row, enrichment);
  if (vizJson) updated.visualization = vizJson;

  updated.updated_at = nowISO();
  return updated;
}

/** Check if enrichment has any new data to apply */
function hasEnrichment(enrichment: WikidataEnrichment): boolean {
  return (
    enrichment.material != null ||
    enrichment.area != null ||
    enrichment.height != null ||
    enrichment.interiorImageUrl != null ||
    enrichment.partOf != null ||
    enrichment.architect != null ||
    enrichment.architecturalStyle != null ||
    enrichment.instanceOf != null
  );
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
    const row = db.prepare("SELECT * FROM temples WHERE id = ?").get(args.temple) as TempleRow | undefined;
    temples = row?.wikidata_id ? [row] : [];
  } else {
    temples = db
      .prepare(
        "SELECT * FROM temples WHERE wikidata_id IS NOT NULL AND wikidata_id != ''"
      )
      .all() as TempleRow[];
  }

  if (temples.length === 0) {
    console.log("[wikidata] No temples with wikidata_id to process");
    return 0;
  }

  console.log(`[wikidata] Processing ${temples.length} temples in batches of ${BATCH_SIZE}`);

  const qidToTemple = new Map<string, TempleRow>();
  for (const t of temples) {
    const qid = (t.wikidata_id ?? "").replace(/^q/i, "Q");
    if (qid) qidToTemple.set(qid.toLowerCase(), t);
  }

  const allQids = [...qidToTemple.keys()].map((k) => k.replace(/^q/, "Q"));
  let updated = 0;

  for (let i = 0; i < allQids.length; i += BATCH_SIZE) {
    const batch = allQids.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(allQids.length / BATCH_SIZE);

    try {
      const enrichments = await fetchWikidataBatch(
        batch,
        rateLimit,
        fetchWithRetry
      );

      for (const [qid, enrichment] of enrichments) {
        if (!hasEnrichment(enrichment)) continue;

        const temple = qidToTemple.get(qid);
        if (!temple) continue;

        const merged = mergeEnrichment(temple, enrichment);

        if (!args.dryRun) {
          upsertTemple(db, merged);
        }
        updated++;
      }

      console.log(
        `[wikidata] Batch ${batchNum}/${totalBatches} (${batch.length} temples)`
      );
    } catch (err) {
      console.error(
        `[wikidata] Batch ${batchNum}/${totalBatches} failed:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  return updated;
}
