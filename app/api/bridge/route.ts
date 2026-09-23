import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { assertPinVerified } from "@/lib/pin";
import {
  BRIDGE_NETWORKS,
  BRIDGE_TO_CIRCLE_BLOCKCHAIN,
  type BridgeNetworkKey,
  executeArcBridge,
} from "@/lib/app-kit";
import { GLIDE_BLOCKCHAIN, safeApiError } from "@/lib/circle";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { notifyBridgeComplete } from "@/lib/push";
import { recordTransaction } from "@/lib/transactions-db";
import { getOrCreateWalletForUser, userOwnsWallet } from "@/lib/users";
import { addressesEqual } from "@/lib/tokens";
import { isValidWalletAddress, parseMoneyAmount } from "@/lib/validation";
import { assertSufficientBalance } from "@/lib/wallet-service";
import { NextRequest, NextResponse } from "next/server";

// CCTP bridges do burn + attestation + mint and routinely take 20-40s.
// Default Vercel timeout (10s) was returning the HTML timeout page.
export const maxDuration = 60;

/** POST { walletId, amount, network } - bridge USDC from Arc via CCTP.
 *  Entire body is wrapped in a try/catch so any error returns JSON. */
export async function POST(request: NextRequest) {
  let pendingRowId: string | null = null;
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
      destinationAddress?: string;
    };

    const walletId = body.walletId?.trim();
    const amount = body.amount?.trim();
    const network = body.network?.trim().toLowerCase() as BridgeNetworkKey;
    const destinationAddress = body.destinationAddress?.trim() ?? "";

    if (!walletId || !amount || !network) {
      return NextResponse.json(
        { error: "walletId, amount, and network are required" },
        { status: 400 },
      );
    }
    if (!isValidWalletAddress(destinationAddress)) {
      return NextResponse.json(
        { error: "Enter the wallet address that should receive the USDC." },
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

    // glidepay's Arc address isn't a wallet the user controls on other chains,
    // and their own receive address would just sweep straight back: both would
    // strand or loop the funds.
    const ownReceive = await prisma.walletAddress.findFirst({
      where: {
        userId: session.userId,
        chain: BRIDGE_TO_CIRCLE_BLOCKCHAIN[network],
      },
      select: { address: true },
    });
    if (
      addressesEqual(destinationAddress, wallet.address) ||
      addressesEqual(destinationAddress, ownReceive?.address)
    ) {
      return NextResponse.json(
        {
          error: `That's your own glidepay address. Enter a wallet you control on ${BRIDGE_NETWORKS[network].label}.`,
        },
        { status: 400 },
      );
    }

    await assertSufficientBalance(walletId, parsed);

    // Record before bridging: if the function times out mid-bridge the user
    // still sees a pending bridge in Activity — not nothing, which invites a
    // retry and a second burn.
    const { row: pendingRow } = await recordTransaction({
      userId: session.userId,
      kind: "bridge",
      title: `Bridge to ${label}`,
      amountLabel: `−$${parsed.toFixed(2)}`,
      variant: "neutral",
      status: "pending",
      chain: GLIDE_BLOCKCHAIN,
      metadata: { destination: label, network, recipientAddress: destinationAddress },
    });
    pendingRowId = pendingRow.id;

    const bridge = await executeArcBridge({
      walletAddress: wallet.address,
      amount: parsed.toFixed(2),
      network,
      recipientAddress: destinationAddress,
    });

    // App Kit reports failures on the result (state "error") rather than
    // throwing. Before the burn nothing moved; after it the USDC is in
    // transit (resumable via kit.retry from the saved result).
    const status =
      bridge.state === "success"
        ? "completed"
        : bridge.state === "error" && !bridge.burned
          ? "failed"
          : "pending";

    await prisma.transaction
      .update({
        where: { id: pendingRow.id },
        data: {
          status,
          txHash: bridge.txHash ?? null,
          explorerUrl: bridge.explorerUrl ?? null,
          metadata: {
            destination: label,
            network,
            recipientAddress: destinationAddress,
            ...(status === "completed"
              ? {}
              : { bridgeState: bridge.state, bridgeResult: bridge.snapshot }),
          } as Prisma.InputJsonValue,
        },
      })
      .catch((err) => console.error("[Glide] bridge record:", err));

    if (status === "failed") {
      return NextResponse.json(
        { error: "Bridge could not be completed. Your USDC was not moved." },
        { status: 502 },
      );
    }

    if (status === "completed") {
      void notifyBridgeComplete(session.userId, parsed.toFixed(2), label).catch(
        (err) => console.error("[Glide] bridge push:", err),
      );
    }

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
    if (pendingRowId) {
      await prisma.transaction
        .update({ where: { id: pendingRowId }, data: { status: "failed" } })
        .catch(() => {});
    }
    const message = safeApiError(err);
    const status = message.toLowerCase().includes("insufficient") ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
