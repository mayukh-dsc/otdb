import { NextRequest, NextResponse } from "next/server";
import { queryTemples, type QueryFilters } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const filters: QueryFilters = {};
  if (searchParams.has("religion")) filters.religion = searchParams.get("religion")!;
  if (searchParams.has("country")) filters.country = searchParams.get("country")!;
  if (searchParams.has("style")) filters.style = searchParams.get("style")!;
  if (searchParams.get("hasVisualization") === "true") filters.hasVisualization = true;
  if (searchParams.has("tag")) filters.tag = searchParams.get("tag")!;

  try {
    const temples = queryTemples(Object.keys(filters).length > 0 ? filters : undefined);
    return NextResponse.json(temples);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
