import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { createCircleClient, safeApiError } from "@/lib/circle";
import { ARC_NETWORK, IS_MAINNET } from "@/lib/network";
import { getOrCreateWalletForUser } from "@/lib/users";
import { fetchWalletById } from "@/lib/wallet-service";
import { NextResponse } from "next/server";

/** POST - request testnet USDC for the signed-in user's Arc wallet (Circle faucet).
 * Testnet only: there is no faucet for real money. */
export async function POST() {
  if (IS_MAINNET || ARC_NETWORK.circleBlockchain !== "ARC-TESTNET") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  try {
    const { wallet } = await getOrCreateWalletForUser({
      userId: session.userId,
      email: session.email,
      displayName: session.displayName,
    });

    let address = wallet.address;
    if (!address) {
      const fromCircle = await fetchWalletById(wallet.id);
      address = fromCircle?.address ?? "";
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
      blockchain: ARC_NETWORK.circleBlockchain,
      usdc: true,
    });

    return NextResponse.json({ ok: true, address });
  } catch (err) {
    console.error("[Glide] wallet/fund:", err);
    return NextResponse.json({ error: safeApiError(err) }, { status: 502 });
  }
}
