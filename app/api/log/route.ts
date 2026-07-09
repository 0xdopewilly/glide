import { NextRequest, NextResponse } from "next/server";

/** Best-effort client-error sink. Console-only (no DB write), so it stays cheap
 * and abuse just means log noise. Public (see proxy.ts) because errors happen
 * on unauthenticated pages and inside the global error boundary too. All fields
 * are truncated defensively. */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      source?: string;
      message?: string;
      digest?: string;
      stack?: string;
      url?: string;
    };
    console.error("[Glide] client error", {
      source: String(body.source ?? "unknown").slice(0, 60),
      message: String(body.message ?? "").slice(0, 500),
      digest: body.digest ? String(body.digest).slice(0, 100) : undefined,
      url: String(body.url ?? "").slice(0, 300),
      stack: body.stack ? String(body.stack).slice(0, 2000) : undefined,
    });
  } catch {
    /* ignore — logging must never error */
  }
  return NextResponse.json({ ok: true });
}
