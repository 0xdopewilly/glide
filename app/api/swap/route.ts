import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import type { FlowSuccess } from "@/lib/flow-api";
import { safeApiError } from "@/lib/circle";
import { userOwnsWallet } from "@/lib/users";
import { parseMoneyAmount } from "@/lib/validation";
import { assertSufficientBalance, fetchWalletBalance } from "@/lib/wallet-service";
import { NextRequest, NextResponse } from "next/server";

const SWAP_RATE = 0.92;

/** POST { walletId, amount } — testnet swap preview (balance checked, recorded in app) */
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
    await assertSufficientBalance(walletId, parsed);
    const balance = await fetchWalletBalance(walletId);
    const received = parsed * SWAP_RATE;

    const payload: FlowSuccess = {
      ok: true,
      balance,
      transaction: {
        id: `swap-${Date.now()}`,
        title: "Swapped USDC to EURC",
        amount: `−$${parsed.toFixed(2)}`,
        variant: "neutral",
        meta: "Just now",
        kind: "swap",
        status: "completed",
      },
    };

    return NextResponse.json({
      ...payload,
      receivedAmount: received.toFixed(2),
      rate: SWAP_RATE,
    });
  } catch (err) {
    console.error("[Glide] swap:", err);
    const message = safeApiError(err);
    const status = message.toLowerCase().includes("insufficient") ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
