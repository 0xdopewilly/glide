import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

/** GET /api/health/db — quick check that Prisma can reach the database. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, provider: "connected" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database unreachable";
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
}
