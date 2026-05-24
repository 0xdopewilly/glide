import { kitKeyStatus } from "@/lib/kit-key";
import { NextResponse } from "next/server";

/** GET - Kit key config check (no secrets). Use after setting Vercel env vars. */
export async function GET() {
  const result = kitKeyStatus();
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}
