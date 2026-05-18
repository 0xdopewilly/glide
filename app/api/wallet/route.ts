import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { fetchWalletBalance } from "@/lib/wallet-service";
import { getOrCreateWalletForUser, userOwnsWallet } from "@/lib/users";
import { NextRequest, NextResponse } from "next/server";

/** GET — current user's wallet, or ?walletId= with ownership check */
export async function GET(request: NextRequest) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const walletIdParam = request.nextUrl.searchParams.get("walletId");

  try {
    if (walletIdParam) {
      const owns = await userOwnsWallet(session.userId, walletIdParam);
      if (!owns) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const { wallet } = await getOrCreateWalletForUser({
        userId: session.userId,
        email: session.email,
        displayName: session.displayName,
      });
      if (wallet.id !== walletIdParam) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const balance = await fetchWalletBalance(walletIdParam);
      return NextResponse.json({ wallet, balance });
    }

    const { wallet } = await getOrCreateWalletForUser({
      userId: session.userId,
      email: session.email,
      displayName: session.displayName,
    });
    const balance = await fetchWalletBalance(wallet.id);
    return NextResponse.json({ wallet, balance });
  } catch (err) {
    console.error("[Glide] wallet GET:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Wallet error" },
      { status: 502 },
    );
  }
}

/** POST — get or create the authenticated user's Arc SCA */
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
    return NextResponse.json({ wallet, balance });
  } catch (err) {
    console.error("[Glide] wallet POST:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Wallet setup failed" },
      { status: 502 },
    );
  }
}
