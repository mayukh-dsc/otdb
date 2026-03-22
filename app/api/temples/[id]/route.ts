import { NextRequest, NextResponse } from "next/server";
import { queryTempleById } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const temple = queryTempleById(id);
    if (!temple) {
      return NextResponse.json({ error: "Temple not found" }, { status: 404 });
    }
    return NextResponse.json(temple);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
