import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { estimateArcSwap } from "@/lib/app-kit";
import { getOrCreateWalletForUser } from "@/lib/users";
import { NextResponse } from "next/server";

/**
 * Diagnostic: tries kit.estimateSwap with a tiny fixed input and returns
 * whatever Circle / App Kit threw, with stack. Auth required so this is
 * not a public leak, but it's broad on purpose for troubleshooting prod.
 *
 * Remove once swap stability is back.
 */
export const maxDuration = 30;

export async function GET() {
  try {
    const session = await requireSessionUser();
    if (isAuthError(session)) return session;

    const { wallet } = await getOrCreateWalletForUser({
      userId: session.userId,
      email: session.email,
      displayName: session.displayName,
    });

    const result = await estimateArcSwap({
      walletAddress: wallet.address,
      amountIn: "1.00",
      tokenIn: "USDC",
      tokenOut: "EURC",
    });

    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const e = err as Error & { code?: string; cause?: unknown };
    return NextResponse.json(
      {
        ok: false,
        name: e?.name,
        message: e?.message,
        code: e?.code,
        cause: e?.cause ? String(e.cause) : undefined,
        stack: e?.stack?.split("\n").slice(0, 8),
      },
      { status: 200 },
    );
  }
}
