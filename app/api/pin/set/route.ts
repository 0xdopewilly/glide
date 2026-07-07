import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { setUserPin } from "@/lib/pin";
import { NextResponse } from "next/server";

/** POST { pin, currentPin? } - set (first time) or change the PIN. Changing
 * requires the current PIN. On success the verified session opens so a pending
 * transfer can proceed. */
export async function POST(req: Request) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const pin = typeof b.pin === "string" ? b.pin : "";
  const currentPin = typeof b.currentPin === "string" ? b.currentPin : undefined;

  const result = await setUserPin(session.userId, { pin, currentPin });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
