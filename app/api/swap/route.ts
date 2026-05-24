import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { executeArcSwap } from "@/lib/app-kit";
import { safeApiError } from "@/lib/circle";
import { notifySwapComplete } from "@/lib/push";
import { recordTransaction } from "@/lib/transactions-db";
import { getOrCreateWalletForUser, userOwnsWallet } from "@/lib/users";
import { parseMoneyAmount } from "@/lib/validation";
import { assertSufficientBalance } from "@/lib/wallet-service";
import { NextRequest, NextResponse } from "next/server";

const SUPPORTED_TOKENS = new Set(["USDC", "EURC", "cirBTC"] as const);
type SwapToken = "USDC" | "EURC" | "cirBTC";

function symbolFor(token: SwapToken): string {
  return token; // display label matches alias
}

function prefixFor(token: SwapToken): string {
  if (token === "EURC") return "€";
  if (token === "cirBTC") return "₿";
  return "$";
}

/** POST { walletId, amount, tokenIn?, tokenOut? } - token swap on Arc testnet via Circle App Kit.
 *  Arc supports USDC, EURC, cirBTC. Defaults to USDC → EURC. */
export async function POST(request: NextRequest) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const body = (await request.json()) as {
    walletId?: string;
    amount?: string;
    tokenIn?: string;
    tokenOut?: string;
  };
  const walletId = body.walletId?.trim();
  const amount = body.amount?.trim();
  const tokenIn = (body.tokenIn ?? "USDC") as SwapToken;
  const tokenOut = (body.tokenOut ?? "EURC") as SwapToken;

  if (!walletId || !amount) {
    return NextResponse.json(
      { error: "walletId and amount are required" },
      { status: 400 },
    );
  }
  if (!SUPPORTED_TOKENS.has(tokenIn) || !SUPPORTED_TOKENS.has(tokenOut)) {
    return NextResponse.json(
      { error: "Unsupported token pair" },
      { status: 400 },
    );
  }
  if (tokenIn === tokenOut) {
    return NextResponse.json(
      { error: "Pick two different tokens to swap" },
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

    // assertSufficientBalance is USDC-only today; gate on USDC swaps only.
    if (tokenIn === "USDC") {
      await assertSufficientBalance(walletId, parsed);
    }

    const amountInStr = tokenIn === "cirBTC" ? String(parsed) : parsed.toFixed(2);

    const swap = await executeArcSwap({
      walletAddress: wallet.address,
      amountIn: amountInStr,
      tokenIn,
      tokenOut,
    });

    const received = swap.amountOut ?? "";
    const inLabel = `${prefixFor(tokenIn)}${amountInStr}`;
    const title = `Swapped ${symbolFor(tokenIn)} to ${symbolFor(tokenOut)}`;

    void recordTransaction({
      userId: session.userId,
      kind: "swap",
      title,
      amountLabel: `−${inLabel}`,
      variant: "neutral",
      status: "completed",
      txHash: swap.txHash,
      explorerUrl: swap.explorerUrl,
      chain: "ARC-TESTNET",
      metadata: { amountOut: received, tokenIn, tokenOut },
    }).catch((err) => console.error("[Glide] swap record:", err));

    void notifySwapComplete(session.userId, amountInStr).catch((err) =>
      console.error("[Glide] swap push:", err),
    );

    return NextResponse.json({
      ok: true,
      txHash: swap.txHash,
      explorerUrl: swap.explorerUrl,
      receivedAmount: received,
      transaction: {
        id: swap.txHash,
        title,
        amount: `−${inLabel}`,
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
