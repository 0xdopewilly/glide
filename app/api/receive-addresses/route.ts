import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { safeApiError } from "@/lib/circle";
import { getReceiveAddresses } from "@/lib/users";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

/** GET — return all per-chain receive addresses for Universal Receive,
 * lazily provisioning Circle wallets on first call. */
export async function GET() {
  try {
    const session = await requireSessionUser();
    if (isAuthError(session)) return session;

    const addresses = await getReceiveAddresses(session.userId);
    return NextResponse.json({ addresses });
  } catch (err) {
    console.error("[Glide] receive-addresses:", err);
    return NextResponse.json({ error: safeApiError(err) }, { status: 502 });
  }
}
