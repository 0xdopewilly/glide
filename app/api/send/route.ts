import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { createCircleClient, GLIDE_BLOCKCHAIN, safeApiError } from "@/lib/circle";
import { userOwnsWallet } from "@/lib/users";
import { fetchWalletBalance, fetchWalletById } from "@/lib/wallet-service";
import { NextRequest, NextResponse } from "next/server";

/** POST { walletId, destinationAddress, amount } */
export async function POST(request: NextRequest) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const body = (await request.json()) as {
    walletId?: string;
    destinationAddress?: string;
    amount?: string;
  };

  const walletId = body.walletId?.trim();
  const destinationAddress = body.destinationAddress?.trim();
  const amount = body.amount?.trim();

  if (!walletId || !destinationAddress || !amount) {
    return NextResponse.json(
      { error: "walletId, destinationAddress, and amount are required" },
      { status: 400 },
    );
  }

  const owns = await userOwnsWallet(session.userId, walletId);
  if (!owns) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = parseFloat(amount);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const initialized = createCircleClient();
  if ("error" in initialized) {
    return NextResponse.json({ error: initialized.error }, { status: 500 });
  }

  try {
    const wallet = await fetchWalletById(walletId);
    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    const res = await initialized.client.createTransaction({
      walletAddress: wallet.address,
      blockchain: GLIDE_BLOCKCHAIN,
      tokenAddress: "",
      destinationAddress,
      amount: [amount],
      fee: {
        type: "level",
        config: { feeLevel: "MEDIUM" },
      },
    });

    const balance = await fetchWalletBalance(walletId);

    return NextResponse.json({
      transactionId: res.data?.id,
      state: res.data?.state,
      balance,
    });
  } catch (err) {
    console.error("[Glide] send:", err);
    return NextResponse.json({ error: safeApiError(err) }, { status: 502 });
  }
}
