import { NextRequest, NextResponse } from "next/server";
import { queryTemplesByTag, queryTagCounts } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tag = searchParams.get("tag");

  try {
    if (tag) {
      const temples = queryTemplesByTag(tag);
      return NextResponse.json(
        { tag, count: temples.length, temples },
        { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
      );
    }

    const counts = queryTagCounts();
    return NextResponse.json(
      { tags: counts },
      { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
