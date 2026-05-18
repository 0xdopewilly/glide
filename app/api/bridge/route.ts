import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import type { FlowSuccess } from "@/lib/flow-api";
import { safeApiError } from "@/lib/circle";
import { userOwnsWallet } from "@/lib/users";
import { parseMoneyAmount } from "@/lib/validation";
import { assertSufficientBalance, fetchWalletBalance } from "@/lib/wallet-service";
import { NextRequest, NextResponse } from "next/server";

const NETWORK_LABELS: Record<string, string> = {
  ethereum: "Ethereum",
  base: "Base",
  polygon: "Polygon",
  arbitrum: "Arbitrum",
};

/** POST { walletId, amount, network } — testnet bridge preview */
export async function POST(request: NextRequest) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const body = (await request.json()) as {
    walletId?: string;
    amount?: string;
    network?: string;
  };

  const walletId = body.walletId?.trim();
  const amount = body.amount?.trim();
  const network = body.network?.trim().toLowerCase() ?? "";

  if (!walletId || !amount || !network) {
    return NextResponse.json(
      { error: "walletId, amount, and network are required" },
      { status: 400 },
    );
  }

  if (!NETWORK_LABELS[network]) {
    return NextResponse.json({ error: "Unsupported network" }, { status: 400 });
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
    const label = NETWORK_LABELS[network];

    const payload: FlowSuccess = {
      ok: true,
      balance,
      transaction: {
        id: `bridge-${Date.now()}`,
        title: `Bridge to ${label}`,
        amount: `−$${parsed.toFixed(2)}`,
        variant: "neutral",
        meta: "Processing",
        kind: "bridge",
        status: "pending",
      },
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error("[Glide] bridge:", err);
    const message = safeApiError(err);
    const status = message.toLowerCase().includes("insufficient") ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
