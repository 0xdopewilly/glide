import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { estimateArcSwap } from "@/lib/app-kit";
import { safeApiError } from "@/lib/circle";
import { getOwnedWalletAddress } from "@/lib/users";
import { parseMoneyAmount } from "@/lib/validation";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

const SUPPORTED = new Set(["USDC", "EURC", "cirBTC"]);

/** POST { walletId, amount, tokenIn, tokenOut } - estimate a same-chain swap. */
export async function POST(request: NextRequest) {
  try {
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
    const tokenIn = (body.tokenIn ?? "USDC") as "USDC" | "EURC" | "cirBTC";
    const tokenOut = (body.tokenOut ?? "EURC") as "USDC" | "EURC" | "cirBTC";

    if (!walletId || !amount) {
      return NextResponse.json(
        { error: "walletId and amount are required" },
        { status: 400 },
      );
    }
    if (!SUPPORTED.has(tokenIn) || !SUPPORTED.has(tokenOut) || tokenIn === tokenOut) {
      return NextResponse.json({ error: "Unsupported token pair" }, { status: 400 });
    }

    const parsed = parseMoneyAmount(amount);
    if (parsed === null) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const walletAddress = await getOwnedWalletAddress(session.userId, walletId);
    if (!walletAddress) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const amountInStr = tokenIn === "cirBTC" ? String(parsed) : parsed.toFixed(2);

    const estimate = await estimateArcSwap({
      walletAddress,
      amountIn: amountInStr,
      tokenIn,
      tokenOut,
    });

    return NextResponse.json({
      amountOut: estimate.amountOut,
      tokenOut: estimate.tokenOut,
    });
  } catch (err) {
    console.error("[Glide] swap quote:", err);
    return NextResponse.json({ error: safeApiError(err) }, { status: 502 });
  }
}
