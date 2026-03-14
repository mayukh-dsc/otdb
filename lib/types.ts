// ── Source Attribution (Dublin Core provenance) ──────────────────────

export type DataSource =
  | "asi"
  | "wikidata"
  | "wikipedia"
  | "commons"
  | "data-gov";

export interface SourceAttribution {
  source: DataSource;
  url?: string;
  fetchedAt: string; // ISO 8601
}

export interface ImageRef {
  url: string;
  caption?: string;
  attribution: SourceAttribution;
}

// ── Engineering ──────────────────────────────────────────────────────

export interface TempleEngineering {
  // Dimensions
  baseDimensions?: { width: number; depth: number };
  totalArea?: number;
  vimanaHeight?: number;
  vimanaLevels?: number;
  numMandapas?: number;
  numPillars?: number;
  wallThickness?: number;
  orientationDegrees?: number;

  // Structural
  foundationType?: string;
  foundationDepth?: number; // meters
  structuralSystem?: string; // "post-and-lintel", "corbelled", "trabeate"
  joinerySystem?: string; // "dry-fit", "iron-dowel", "lime-mortar", "interlocking"
  mortarType?: string; // "none", "lime", "surkhi", "lead-poured"
  maxSpan?: number; // meters, longest unsupported distance
  capstoneWeight?: number; // tons
  seismicFeatures?: string[];
  loadPathDescription?: string;
  constructionMaterials?: string[];
  constructionTechniques?: string[];
  constructionPeriodYears?: number;

  // Environmental engineering
  acousticProperties?: string;
  lightingDesign?: string;
  thermalDesign?: string;
  ventilationSystem?: string;
  astronomicalAlignments?: string[];

  // Water engineering
  waterFeatures?: { type: string; description: string }[];
  drainageSystem?: string;

  // Architectural classification (finer than architecturalStyle)
  planType?: string; // "square", "rectangular", "stellate", "apsidal", "cruciform"
  superstructureType?: string; // "rekha-deul", "phamsana", "bhumija", "sekhari"
  ceilingType?: string; // "flat", "corbelled-dome", "lotus-medallion", "stepped"
  proportionalSystem?: string; // reference text: "Manasara", "Mayamata"

  uniqueFeatures?: string[];
  structuralFeatures?: string[];
}

// ── Archaeology ──────────────────────────────────────────────────────

export interface ConstructionPhase {
  period: string;
  description: string;
  dynasty?: string;
}

export interface InscriptionRecord {
  language: string;
  summary: string;
}

export interface RestorationRecord {
  year: number;
  agency: string;
  scope: string;
}

export interface TempleArchaeology {
  constructionPhases?: ConstructionPhase[];
  datingMethod?: string; // "inscription", "stylistic", "radiocarbon"
  inscriptions?: InscriptionRecord[];
  restorationHistory?: RestorationRecord[];
  sthapati?: string; // architect / master builder
  patronDetails?: string; // more specific than dynasty
  silpaShstraReference?: string; // canonical text followed
  influencedBy?: string[]; // temple IDs
}

// ── Visualization ────────────────────────────────────────────────────

export interface TempleVisualization {
  available: boolean;
  floorPlanUrls?: ImageRef[];
  crossSectionUrls?: ImageRef[];
  elevationUrls?: ImageRef[];
  interiorImageUrls?: ImageRef[];
}

// ── Handbook (glossary / iconography) ────────────────────────────────

export type HandbookCategory =
  | "anatomy"
  | "style"
  | "technique"
  | "material"
  | "water"
  | "plan"
  | "environmental";

export interface HandbookTerm {
  slug: string;
  name: string;
  originalTerm?: string; // Sanskrit/Tamil original
  category: HandbookCategory;
  shortDescription: string;
  fullDescription: string;
  diagramUrl?: string;
  icon: string; // icon identifier for FeatureBadge
  graphTag: string; // maps to Temple.graphTags e.g. "technique:dry-fit"
}

// ── Temple (main entity) ─────────────────────────────────────────────

export interface Temple {
  id: string;
  name: string;
  alternateName?: string;
  latitude: number;
  longitude: number;
  yearBuilt: number; // negative = BC (e.g., -500 = 500 BC)
  yearBuiltApproximate: boolean;
  yearBuiltEnd?: number;
  deity?: string;
  religion: "Hindu" | "Buddhist" | "Jain" | "Other";
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
  floorPlanUrl?: string;
  imageUrl?: string;
  wikipediaUrl?: string;
  wikidataId: string;
  country: string;
  state?: string;
  currentCondition?: "Active" | "Ruins" | "Restored" | "Partially Ruined";

  // Enrichment
  engineering?: TempleEngineering;
  archaeology?: TempleArchaeology;
  visualization?: TempleVisualization;
  graphTags?: string[];
}

// ── Time Range (for map filter) ──────────────────────────────────────

export interface TimeRange {
  start: number;
  end: number;
}

export const MIN_YEAR = -1000;
export const MAX_YEAR = 2026;
