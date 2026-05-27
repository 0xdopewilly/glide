import type { BridgeNetworkKey } from "@/lib/app-kit";
import { sweepIncomingToArc } from "@/lib/app-kit";
import {
  getReceiveChainByCircleBlockchain,
  RECEIVE_CHAINS,
  type ReceiveChainKey,
} from "@/lib/circle";
import { prisma } from "@/lib/db";
import { notifyIncomingFromChain } from "@/lib/push";
import { findUserByReceiveAddress, getUserById } from "@/lib/users";

const RECEIVE_TO_BRIDGE: Record<ReceiveChainKey, BridgeNetworkKey> = {
  base: "base",
};

export type IncomingTransfer = {
  /** Circle blockchain string, e.g. "BASE-SEPOLIA". */
  circleBlockchain: string;
  /** Glide-side receive address (the user's wallet on the source chain). */
  destinationAddress: string;
  /** Human-readable USDC amount, e.g. "12.50". */
  amount: string;
  /** Source-chain tx hash that delivered the funds. Used for idempotency. */
  sourceTxHash: string;
};

type ClaimResult =
  | { status: "claimed"; transactionId: string; userId: string; arcAddress: string; sourceNetwork: BridgeNetworkKey; chainLabel: string }
  | { status: "duplicate" }
  | { status: "unknown_address"; detail?: string }
  | { status: "no_arc_wallet" };

/** Atomic dedup claim: inserts a pending Transaction row with the source
 * txHash. The DB's unique constraint on bridgeSourceTxHash blocks duplicate
 * claims — no race window even when Circle retries the webhook in parallel.
 * Returns "duplicate" if another instance already owns this sourceTxHash. */
export async function claimIncoming(event: IncomingTransfer): Promise<ClaimResult> {
  const receiveKey = getReceiveChainByCircleBlockchain(event.circleBlockchain);
  if (!receiveKey) {
    return { status: "unknown_address", detail: "chain not enrolled" };
  }
  const bridgeKey = RECEIVE_TO_BRIDGE[receiveKey];
  const chainLabel = RECEIVE_CHAINS[receiveKey].label;

  const owner = await findUserByReceiveAddress(
    event.circleBlockchain,
    event.destinationAddress,
  );
  if (!owner) return { status: "unknown_address" };

  const dbUser = await getUserById(owner.userId);
  if (!dbUser?.circleWalletAddress) return { status: "no_arc_wallet" };

  try {
    const tx = await prisma.transaction.create({
      data: {
        userId: owner.userId,
        kind: "receive",
        title: `Received via ${chainLabel}`,
        amountLabel: `+$${event.amount}`,
        variant: "credit",
        status: "pending",
        chain: "arc-testnet",
        originChain: chainLabel,
        bridgeSourceTxHash: event.sourceTxHash,
        metadata: {
          sourceTxHash: event.sourceTxHash,
          sourceChain: event.circleBlockchain,
          token: "USDC",
        },
      },
    });
    return {
      status: "claimed",
      transactionId: tx.id,
      userId: owner.userId,
      arcAddress: dbUser.circleWalletAddress,
      sourceNetwork: bridgeKey,
      chainLabel,
    };
  } catch (err) {
    // Unique constraint violation = another invocation already owns this event.
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      return { status: "duplicate" };
    }
    throw err;
  }
}

/** Run the actual CCTP bridge, then update the claimed row + notify the user.
 * Safe to call after claimIncoming returns "claimed". Errors update the row's
 * status field so they show up in Activity (and admin can retry later). */
export async function completeSweep(input: {
  transactionId: string;
  userId: string;
  sourceNetwork: BridgeNetworkKey;
  sourceAddress: string;
  arcAddress: string;
  amount: string;
  chainLabel: string;
}) {
  try {
    const result = await sweepIncomingToArc({
      sourceNetwork: input.sourceNetwork,
      sourceAddress: input.sourceAddress,
      destinationAddress: input.arcAddress,
      amount: input.amount,
    });

    await prisma.transaction.update({
      where: { id: input.transactionId },
      data: {
        status: result.state ?? "confirmed",
        txHash: result.txHash ?? null,
        explorerUrl: result.explorerUrl ?? null,
      },
    });

    await notifyIncomingFromChain(input.userId, {
      amount: input.amount,
      chainLabel: input.chainLabel,
      transactionId: input.transactionId,
    });

    return { status: "swept" as const };
  } catch (err) {
    const detail = err instanceof Error ? err.message : "sweep failed";
    console.error("[Glide] completeSweep:", err);
    await prisma.transaction.update({
      where: { id: input.transactionId },
      data: { status: "failed", metadata: { error: detail } },
    });
    return { status: "failed" as const, detail };
  }
}
