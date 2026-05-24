import { NextResponse } from "next/server";

/** Bare route. No App Kit, no Prisma, no Clerk. Confirms the Vercel function
 *  layer is healthy. If this returns JSON but /api/debug/swap-estimate
 *  returns Vercel's HTML error page, the problem is App Kit at module load. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    node: process.version,
    region: process.env.VERCEL_REGION ?? null,
    deployment: process.env.VERCEL_DEPLOYMENT_ID ?? null,
    time: new Date().toISOString(),
  });
}
