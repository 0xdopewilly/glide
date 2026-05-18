import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { createCircleClient, GLIDE_BLOCKCHAIN, safeApiError } from "@/lib/circle";
import { addressesEqual } from "@/lib/tokens";
import { getOrCreateWalletForUser, userOwnsWallet } from "@/lib/users";
import { fetchWalletById } from "@/lib/wallet-service";
import { NextRequest, NextResponse } from "next/server";

/** POST { walletId?, address? } — testnet USDC faucet for the signed-in user's wallet */
export async function POST(request: NextRequest) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const body = (await request.json()) as { walletId?: string; address?: string };
  const walletIdParam = body.walletId?.trim();
  const addressParam = body.address?.trim();

  try {
    const { wallet, user } = await getOrCreateWalletForUser({
      userId: session.userId,
      email: session.email,
      displayName: session.displayName,
    });

    if (walletIdParam && wallet.id !== walletIdParam) {
      const owns = await userOwnsWallet(session.userId, walletIdParam);
      if (!owns) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    let address = wallet.address;
    if (addressParam && !addressesEqual(address, addressParam)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!address) {
      const fromCircle = await fetchWalletById(wallet.id);
      address = fromCircle?.address ?? user.circleWalletAddress ?? "";
    }

    if (!address) {
      return NextResponse.json({ error: "Wallet address not found" }, { status: 404 });
    }

    const initialized = createCircleClient();
    if ("error" in initialized) {
      return NextResponse.json({ error: initialized.error }, { status: 500 });
    }

    await initialized.client.requestTestnetTokens({
      address,
      blockchain: GLIDE_BLOCKCHAIN,
      usdc: true,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Glide] wallet/fund:", err);
    return NextResponse.json({ error: safeApiError(err) }, { status: 502 });
  }
}
