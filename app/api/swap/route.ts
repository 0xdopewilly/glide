import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { executeArcSwap } from "@/lib/app-kit";
import { safeApiError } from "@/lib/circle";
import { notifySwapComplete } from "@/lib/push";
import { recordTransaction } from "@/lib/transactions-db";
import { getOrCreateWalletForUser, userOwnsWallet } from "@/lib/users";
import { parseMoneyAmount } from "@/lib/validation";
import { assertSufficientBalance } from "@/lib/wallet-service";
import { NextRequest, NextResponse } from "next/server";

/** POST { walletId, amount } — USDC → EURC on Arc testnet via Circle App Kit */
export async function POST(request: NextRequest) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const body = (await request.json()) as { walletId?: string; amount?: string };
  const walletId = body.walletId?.trim();
  const amount = body.amount?.trim();

  if (!walletId || !amount) {
    return NextResponse.json(
      { error: "walletId and amount are required" },
      { status: 400 },
    );
  }

  const parsed = parseMoneyAmount(amount);
  if (parsed === null) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const owns = await userOwnsWallet(session.userId, walletId);
  if (!owns) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { wallet } = await getOrCreateWalletForUser({
      userId: session.userId,
      email: session.email,
      displayName: session.displayName,
    });

    if (wallet.id !== walletId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await assertSufficientBalance(walletId, parsed);

    const swap = await executeArcSwap({
      walletAddress: wallet.address,
      amountIn: parsed.toFixed(2),
    });

    const received = swap.amountOut ?? (parsed * 0.92).toFixed(2);

    void recordTransaction({
      userId: session.userId,
      kind: "swap",
      title: "Swapped USDC to EURC",
      amountLabel: `−$${parsed.toFixed(2)}`,
      variant: "neutral",
      status: "completed",
      txHash: swap.txHash,
      explorerUrl: swap.explorerUrl,
      chain: "ARC-TESTNET",
      metadata: { amountOut: received, tokenOut: "EURC" },
    }).catch((err) => console.error("[Glide] swap record:", err));

    void notifySwapComplete(session.userId, parsed.toFixed(2)).catch((err) =>
      console.error("[Glide] swap push:", err),
    );

    return NextResponse.json({
      ok: true,
      txHash: swap.txHash,
      explorerUrl: swap.explorerUrl,
      receivedAmount: received,
      transaction: {
        id: swap.txHash,
        title: "Swapped USDC to EURC",
        amount: `−$${parsed.toFixed(2)}`,
        variant: "neutral",
        meta: "Just now",
        kind: "swap",
        status: "completed",
        txHash: swap.txHash,
        explorerUrl: swap.explorerUrl,
      },
    });
  } catch (err) {
    console.error("[Glide] swap:", err);
    const message = safeApiError(err);
    const status = message.toLowerCase().includes("insufficient") ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
