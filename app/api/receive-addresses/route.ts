import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { safeApiError } from "@/lib/circle";
import { getReceiveAddresses } from "@/lib/users";
import { fetchUsdcBalanceAnyChain } from "@/lib/wallet-service";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

/** GET — return all per-chain receive addresses for Universal Receive,
 * lazily provisioning Circle wallets on first call. Each entry includes the
 * current USDC balance on that chain so the UI can offer a manual sweep. */
export async function GET() {
  try {
    const session = await requireSessionUser();
    if (isAuthError(session)) return session;

    const addresses = await getReceiveAddresses(session.userId);
    const enriched = await Promise.all(
      addresses.map(async (a) => {
        const usdcBalance = await fetchUsdcBalanceAnyChain(a.walletId).catch(
          () => 0,
        );
        return { ...a, usdcBalance };
      }),
    );
    return NextResponse.json({ addresses: enriched });
  } catch (err) {
    console.error("[Glide] receive-addresses:", err);
    return NextResponse.json({ error: safeApiError(err) }, { status: 502 });
  }
}
