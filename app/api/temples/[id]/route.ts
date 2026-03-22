import { NextRequest, NextResponse } from "next/server";
import { queryTempleById } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const start = Date.now();
  const { id } = await params;

  try {
    const temple = queryTempleById(id);
    if (!temple) {
      return NextResponse.json({ error: "Temple not found" }, { status: 404 });
    }
    return NextResponse.json(temple, {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
        "Server-Timing": `db;dur=${Date.now() - start}`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
