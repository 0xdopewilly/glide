import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { assertPinVerified } from "@/lib/pin";
import {
  BRIDGE_NETWORKS,
  executeArcBridge,
  type BridgeNetworkKey,
} from "@/lib/app-kit";
import { safeApiError } from "@/lib/circle";
import { notifyBridgeComplete } from "@/lib/push";
import { recordTransaction } from "@/lib/transactions-db";
import { getOrCreateWalletForUser, userOwnsWallet } from "@/lib/users";
import { parseMoneyAmount } from "@/lib/validation";
import { assertSufficientBalance } from "@/lib/wallet-service";
import { NextRequest, NextResponse } from "next/server";

// CCTP bridges do burn + attestation + mint and routinely take 20-40s.
// Default Vercel timeout (10s) was returning the HTML timeout page.
export const maxDuration = 60;

/** POST { walletId, amount, network } - bridge USDC from Arc via CCTP.
 *  Entire body is wrapped in a try/catch so any error returns JSON. */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSessionUser();
    if (isAuthError(session)) return session;

    const gate = await assertPinVerified(session.userId);
    if (!gate.ok) {
      return NextResponse.json(
        { error: "Confirm with your PIN to continue.", code: gate.code },
        { status: 401 },
      );
    }

    const body = (await request.json()) as {
      walletId?: string;
      amount?: string;
      network?: string;
    };

    const walletId = body.walletId?.trim();
    const amount = body.amount?.trim();
    const network = body.network?.trim().toLowerCase() as BridgeNetworkKey;

    if (!walletId || !amount || !network) {
      return NextResponse.json(
        { error: "walletId, amount, and network are required" },
        { status: 400 },
      );
    }

    if (!(network in BRIDGE_NETWORKS)) {
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

    const label = BRIDGE_NETWORKS[network].label;

    const { wallet } = await getOrCreateWalletForUser({
      userId: session.userId,
      email: session.email,
      displayName: session.displayName,
    });

    if (wallet.id !== walletId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await assertSufficientBalance(walletId, parsed);

    const bridge = await executeArcBridge({
      walletAddress: wallet.address,
      amount: parsed.toFixed(2),
      network,
    });

    const status =
      bridge.state === "success"
        ? "completed"
        : bridge.state === "error"
          ? "failed"
          : "pending";

    void recordTransaction({
      userId: session.userId,
      kind: "bridge",
      title: `Bridge to ${label}`,
      amountLabel: `−$${parsed.toFixed(2)}`,
      variant: "neutral",
      status,
      txHash: bridge.txHash,
      explorerUrl: bridge.explorerUrl,
      chain: "ARC-TESTNET",
      metadata: { destination: label, network },
    }).catch((err) => console.error("[Glide] bridge record:", err));

    void notifyBridgeComplete(session.userId, parsed.toFixed(2), label).catch(
      (err) => console.error("[Glide] bridge push:", err),
    );

    return NextResponse.json({
      ok: true,
      txHash: bridge.txHash,
      explorerUrl: bridge.explorerUrl,
      state: bridge.state,
      transaction: {
        id: bridge.txHash ?? `bridge-${Date.now()}`,
        title: `Bridge to ${label}`,
        amount: `−$${parsed.toFixed(2)}`,
        variant: "neutral",
        meta: status === "completed" ? "Just now" : "Processing",
        kind: "bridge",
        status,
        txHash: bridge.txHash,
        explorerUrl: bridge.explorerUrl,
      },
    });
  } catch (err) {
    console.error("[Glide] bridge:", err);
    const message = safeApiError(err);
    const status = message.toLowerCase().includes("insufficient") ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
