import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { createCircleClient, GLIDE_BLOCKCHAIN, safeApiError } from "@/lib/circle";
import { getOrCreateWalletForUser } from "@/lib/users";
import { fetchWalletById } from "@/lib/wallet-service";
import { NextResponse } from "next/server";

/** POST - request testnet USDC for the signed-in user's Arc wallet (Circle faucet). */
export async function POST() {
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
      blockchain: GLIDE_BLOCKCHAIN,
      usdc: true,
    });

    return NextResponse.json({ ok: true, address });
  } catch (err) {
    console.error("[Glide] wallet/fund:", err);
    return NextResponse.json({ error: safeApiError(err) }, { status: 502 });
  }
}
