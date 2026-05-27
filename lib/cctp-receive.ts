import type { BridgeNetworkKey } from "@/lib/app-kit";
import { sweepIncomingToArc } from "@/lib/app-kit";
import {
  getReceiveChainByCircleBlockchain,
  RECEIVE_CHAINS,
  type ReceiveChainKey,
} from "@/lib/circle";
import { prisma } from "@/lib/db";
import { notifyIncomingFromChain } from "@/lib/push";
import {
  findUserByReceiveAddress,
  getOrCreateReceiveAddress,
  getUserById,
} from "@/lib/users";
import { fetchUsdcBalanceAnyChain } from "@/lib/wallet-service";

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

/** Manual rescue sweep for funds already sitting on a receive chain whose
 * webhook events were already delivered (so handleIncomingUsdc won't fire
 * again). Triggers a single bridge of the full current balance. */
export async function sweepStuckBalance(input: {
  userId: string;
  chain: ReceiveChainKey;
}): Promise<
  | { status: "swept"; amount: string; transactionId: string }
  | { status: "nothing_to_sweep" }
  | { status: "in_progress" }
  | { status: "no_arc_wallet" }
  | { status: "failed"; detail: string }
> {
  const def = RECEIVE_CHAINS[input.chain];
  const bridgeKey = RECEIVE_TO_BRIDGE[input.chain];
  const chainLabel = def.label;

  const receive = await getOrCreateReceiveAddress(input.userId, input.chain);
  const dbUser = await getUserById(input.userId);
  if (!dbUser?.circleWalletAddress) return { status: "no_arc_wallet" };

  // If a bridge claim is already in flight for this user+chain, bail.
  const inFlight = await prisma.transaction.findFirst({
    where: {
      userId: input.userId,
      originChain: chainLabel,
      status: "pending",
      createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
    },
    select: { id: true },
  });
  if (inFlight) return { status: "in_progress" };

  const balance = await fetchUsdcBalanceAnyChain(receive.walletId);
  if (balance <= 0) return { status: "nothing_to_sweep" };

  const amount = balance.toFixed(2);

  // Deterministic synthetic txHash: two clicks within the same 90s bucket
  // collide on the DB unique constraint, so rapid double-taps can't trigger
  // two bridges. Different from webhook txHashes (real 0x... hashes) so
  // never collides with real events.
  const bucket = Math.floor(Date.now() / 90_000);
  const syntheticTxHash = `manual-${receive.walletId}-${bucket}`;

  const claim = await claimIncoming({
    circleBlockchain: def.circleBlockchain,
    destinationAddress: receive.address,
    amount,
    sourceTxHash: syntheticTxHash,
  });

  if (claim.status !== "claimed") {
    if (claim.status === "duplicate") return { status: "in_progress" };
    return { status: "failed", detail: claim.status };
  }

  // Final safety net: re-check the source-chain balance just before issuing
  // the bridge. If it dropped (someone else already swept), abort cleanly.
  const recheck = await fetchUsdcBalanceAnyChain(receive.walletId);
  if (recheck < balance) {
    await prisma.transaction.update({
      where: { id: claim.transactionId },
      data: {
        status: "skipped",
        metadata: { error: "balance changed before sweep" },
      },
    });
    return { status: "in_progress" };
  }

  const result = await completeSweep({
    transactionId: claim.transactionId,
    userId: claim.userId,
    sourceNetwork: bridgeKey,
    sourceAddress: receive.address,
    arcAddress: claim.arcAddress,
    amount,
    chainLabel,
  });

  if (result.status === "swept") {
    return { status: "swept", amount, transactionId: claim.transactionId };
  }
  return { status: "failed", detail: result.detail };
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
