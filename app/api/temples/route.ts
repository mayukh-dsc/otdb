import { NextRequest, NextResponse } from "next/server";
import {
  queryTemples,
  queryTemplesSummary,
  type QueryFilters,
} from "@/lib/db";
import type { BBox } from "@/lib/types";

const MAX_BBOX_AREA_DEG2 = 3600; // ~60x60 degrees max viewport

function parseBBox(param: string | null): BBox | undefined {
  if (!param) return undefined;
  const parts = param.split(",").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return undefined;
  const [south, west, north, east] = parts;
  const area = Math.abs(north - south) * Math.abs(east - west);
  if (area > MAX_BBOX_AREA_DEG2) return undefined;
  return { south, west, north, east };
}

export async function GET(request: NextRequest) {
  const start = Date.now();
  const { searchParams } = request.nextUrl;

  const filters: QueryFilters = {};
  if (searchParams.has("religion")) filters.religion = searchParams.get("religion")!;
  if (searchParams.has("country")) filters.country = searchParams.get("country")!;
  if (searchParams.has("style")) filters.style = searchParams.get("style")!;
  if (searchParams.get("hasVisualization") === "true") filters.hasVisualization = true;
  if (searchParams.has("tag")) filters.tag = searchParams.get("tag")!;
  if (searchParams.has("search")) filters.search = searchParams.get("search")!;

  const bbox = parseBBox(searchParams.get("bbox"));
  if (bbox) filters.bbox = bbox;

  const useSummary = searchParams.get("summary") === "true";
  const limit = Number.parseInt(searchParams.get("limit") ?? "", 10) || undefined;
  const offset = Number.parseInt(searchParams.get("offset") ?? "", 10) || undefined;

  try {
    const latencyMs = () => Date.now() - start;

    if (useSummary) {
      const result = queryTemplesSummary(
        Object.keys(filters).length > 0 ? filters : undefined,
        limit,
        offset
      );
      return NextResponse.json(result, {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
          "Server-Timing": `db;dur=${latencyMs()}`,
          "X-Result-Count": String(result.data.length),
          "X-Total-Count": String(result.total),
        },
      });
    }

    const temples = queryTemples(Object.keys(filters).length > 0 ? filters : undefined);
    return NextResponse.json(temples, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        "Server-Timing": `db;dur=${latencyMs()}`,
        "X-Result-Count": String(temples.length),
      },
    });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
