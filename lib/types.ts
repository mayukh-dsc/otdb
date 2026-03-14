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
}

export interface TimeRange {
  start: number;
  end: number;
}

export const MIN_YEAR = -1000;
export const MAX_YEAR = 2026;
