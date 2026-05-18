import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { getOrCreateWalletForUser } from "@/lib/users";
import { fetchWalletBalance } from "@/lib/wallet-service";
import { NextResponse } from "next/server";

/** POST — alias for authenticated wallet provisioning */
export async function POST() {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  try {
    const { wallet } = await getOrCreateWalletForUser({
      userId: session.userId,
      email: session.email,
      displayName: session.displayName,
    });
    const balance = await fetchWalletBalance(wallet.id);
    return NextResponse.json({ id: wallet.id, address: wallet.address, wallet, balance });
  } catch (err) {
    console.error("[Glide] wallet/create:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Wallet setup failed" },
      { status: 502 },
    );
  }
}
