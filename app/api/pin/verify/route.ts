import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { verifyUserPin } from "@/lib/pin";
import { NextResponse } from "next/server";

/** POST { pin } - verify the PIN and open the ~5 min verified session.
 * Rate-limited via lockout. Returns 401 with remaining attempts on failure. */
export async function POST(req: Request) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const pin =
    typeof (body as Record<string, unknown>)?.pin === "string"
      ? ((body as Record<string, unknown>).pin as string)
      : "";

  const result = await verifyUserPin(session.userId, pin);
  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        remaining: result.remaining,
        lockedUntil: result.lockedUntil,
      },
      { status: 401 },
    );
  }
  return NextResponse.json({ ok: true });
}
