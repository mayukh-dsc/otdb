import { NextRequest, NextResponse } from "next/server";
import { queryTemplesByTag, queryTagCounts } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tag = searchParams.get("tag");

  try {
    if (tag) {
      const temples = queryTemplesByTag(tag);
      return NextResponse.json({ tag, count: temples.length, temples });
    }

    const counts = queryTagCounts();
    return NextResponse.json({ tags: counts });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
