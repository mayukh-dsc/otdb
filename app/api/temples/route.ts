import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  const filePath = join(process.cwd(), "data", "temples.json");
  try {
    const raw = readFileSync(filePath, "utf-8");
    const temples = JSON.parse(raw);
    return NextResponse.json(temples);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
