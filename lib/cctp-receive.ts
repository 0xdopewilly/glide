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

/** Idempotent: handles a Circle inbound-USDC notification by bridging the funds
 * Arc-ward and recording one Transaction row per user. Safe to call twice for
 * the same sourceTxHash (second call no-ops). */
export async function handleIncomingUsdc(event: IncomingTransfer): Promise<{
  status: "swept" | "duplicate" | "unknown_address" | "failed";
  detail?: string;
}> {
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
  if (!owner) {
    return { status: "unknown_address" };
  }

  // Idempotency: if we already recorded this sourceTxHash for this user, skip.
  const existing = await prisma.transaction.findFirst({
    where: {
      userId: owner.userId,
      metadata: { path: ["sourceTxHash"], equals: event.sourceTxHash },
    },
    select: { id: true },
  });
  if (existing) return { status: "duplicate" };

  const dbUser = await getUserById(owner.userId);
  if (!dbUser?.circleWalletAddress) {
    return {
      status: "failed",
      detail: "user has no Arc wallet to mint to",
    };
  }

  try {
    const result = await sweepIncomingToArc({
      sourceNetwork: bridgeKey,
      sourceAddress: event.destinationAddress,
      destinationAddress: dbUser.circleWalletAddress,
      amount: event.amount,
    });

    const tx = await prisma.transaction.create({
      data: {
        userId: owner.userId,
        kind: "receive",
        title: `Received via ${chainLabel}`,
        amountLabel: `+$${event.amount}`,
        variant: "credit",
        status: result.state ?? "confirmed",
        txHash: result.txHash ?? null,
        explorerUrl: result.explorerUrl ?? null,
        chain: "arc-testnet",
        originChain: chainLabel,
        metadata: {
          sourceTxHash: event.sourceTxHash,
          sourceChain: event.circleBlockchain,
          token: "USDC",
        },
      },
    });

    await notifyIncomingFromChain(owner.userId, {
      amount: event.amount,
      chainLabel,
      transactionId: tx.id,
    });

    return { status: "swept" };
  } catch (err) {
    const detail = err instanceof Error ? err.message : "sweep failed";
    console.error("[Glide] sweepIncomingToArc:", err);
    return { status: "failed", detail };
  }
}
