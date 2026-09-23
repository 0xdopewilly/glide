import { auth, reverificationErrorResponse } from "@clerk/nextjs/server";
import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { resetUserPin } from "@/lib/pin";
import { NextResponse } from "next/server";

/** POST - forgot / change PIN. Clearing the PIN unlocks money-out, so an
 * unlocked session alone isn't enough: require a fresh Clerk verification
 * (email code) within the last 10 minutes. The client's useReverification
 * shows Clerk's prompt on this response and retries. */
export async function POST() {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const { has } = await auth();
  if (!has({ reverification: "strict" })) {
    return reverificationErrorResponse("strict");
  }

  await resetUserPin(session.userId);
  return NextResponse.json({ ok: true });
}
