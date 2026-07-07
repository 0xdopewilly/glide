import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { resetUserPin } from "@/lib/pin";
import { NextResponse } from "next/server";

/** POST - forgot-PIN reset. Allowed because the caller is already
 * Clerk-authenticated (the root credential); clears the PIN so they can set a
 * new one. */
export async function POST() {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;
  await resetUserPin(session.userId);
  return NextResponse.json({ ok: true });
}
