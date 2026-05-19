import { kitKeyHealth } from "@/lib/kit-key";
import { NextResponse } from "next/server";

/** GET — whether CIRCLE_KIT_KEY is present and correctly formatted (no secret leaked). */
export async function GET() {
  const result = kitKeyHealth();
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}
