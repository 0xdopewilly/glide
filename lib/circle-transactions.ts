import { createCircleClient } from "@/lib/circle";
import { formatStableAmount } from "@/lib/currency-format";
import { prisma } from "@/lib/db";
import { notifyIncomingPayment } from "@/lib/push";
import {
  ARC_CIRBTC_TOKEN_ADDRESS,
  ARC_EURC_TOKEN_ADDRESS,
  addressesEqual,
  isCirBtcToken,
  isEurcToken,
} from "@/lib/tokens";
import { arcExplorerUrl, recordTransaction } from "@/lib/transactions-db";
import { findUserByWalletAddress } from "@/lib/usernames";
import { formatRelativeDate, shortenAddress } from "@/lib/format";
import type { GlideTransaction, TransactionKind } from "@/lib/types";

type CircleTx = {
  id: string;
  state?: string;
  createDate?: string;
  amounts?: string[];
  destinationAddress?: string;
  sourceAddress?: string;
  transactionType?: string;
  txHash?: string;
  blockchain?: string;
  token?: { symbol?: string; name?: string };
  tokenAddress?: string;
};

function inferKind(tx: CircleTx): TransactionKind {
  const type = tx.transactionType?.toLowerCase() ?? "";
  if (type.includes("inbound") || type.includes("receive")) return "receive";
  return "send";
}

function inferToken(tx: CircleTx): "USDC" | "EURC" | "cirBTC" {
  const sym = tx.token?.symbol ?? tx.token?.name ?? "";
  if (isCirBtcToken(sym)) return "cirBTC";
  if (isEurcToken(sym)) return "EURC";

  // Fall back to contract address (most reliable when Circle omits symbol).
  if (addressesEqual(tx.tokenAddress, ARC_CIRBTC_TOKEN_ADDRESS)) return "cirBTC";
  if (addressesEqual(tx.tokenAddress, ARC_EURC_TOKEN_ADDRESS)) return "EURC";

  const type = tx.transactionType?.toLowerCase() ?? "";
  if (/\bcirbtc\b|\bcir-btc\b/.test(type)) return "cirBTC";
  if (/\beurc\b/.test(type)) return "EURC";
  return "USDC";
}

export function mapCircleTransaction(tx: CircleTx): GlideTransaction {
  const amountRaw = tx.amounts?.[0] ?? "0";
  const amountNum = parseFloat(amountRaw);
  const kind = inferKind(tx);
  const isCredit = kind === "receive";
  const token = inferToken(tx);

  const txHash = tx.txHash;
  const explorerUrl = txHash ? arcExplorerUrl(txHash) : undefined;

  return {
    id: txHash ?? tx.id,
    title: isCredit ? `Received ${token}` : `Sent ${token}`,
    amount: `${isCredit ? "+" : "−"}${formatStableAmount(Math.abs(amountNum), token)}`,
    variant: isCredit ? "credit" : "debit",
    meta: formatRelativeDate(tx.createDate),
    createdAt: tx.createDate ?? new Date().toISOString(),
    status: tx.state,
    kind,
    txHash,
    explorerUrl,
  };
}

export async function fetchCircleTransactions(walletId: string) {
  const initialized = createCircleClient();
  if ("error" in initialized) {
    throw new Error(initialized.error);
  }

  const res = await initialized.client.listTransactions({
    walletIds: [walletId],
    pageSize: 50,
  });

  return (res.data?.transactions ?? []) as CircleTx[];
}

export async function syncCircleTransactionsToDb(
  userId: string,
  walletId: string,
): Promise<GlideTransaction[]> {
  const circleTxs = await fetchCircleTransactions(walletId);

  for (const tx of circleTxs) {
    const token = inferToken(tx);
    const mapped = mapCircleTransaction(tx);

    // Universal Receive: skip Arc INBOUND mints that are CCTP sweep tails.
    // The webhook already created the activity row + fired the push - sync
    // would otherwise duplicate both, even if our pending row hasn't yet been
    // stamped with the Arc-side txHash (race: sync runs between claim and
    // completeSweep). Match by amount on any originChain row for this user
    // created in the last 15 min - cross-chain sweeps are rare enough that
    // amount + recency is a reliable signature.
    if (mapped.kind === "receive") {
      // First: direct txHash match (fast path, post-sweep).
      if (mapped.txHash) {
        const byHash = await prisma.transaction.findFirst({
          where: { userId, txHash: mapped.txHash },
          select: { originChain: true },
        });
        if (byHash?.originChain) continue;
      }

      // Then: pending bridge claim (race window before sweep stamps txHash).
      const amountMagnitude = mapped.amount.replace(/[^0-9.]/g, "");
      if (amountMagnitude) {
        const pending = await prisma.transaction.findFirst({
          where: {
            userId,
            originChain: { not: null },
            amountLabel: { contains: amountMagnitude },
            createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
          },
          orderBy: { createdAt: "desc" },
          select: { id: true, txHash: true },
        });
        if (pending) {
          // Adopt the Arc-side mint metadata onto our existing row so future
          // syncs match via the fast txHash path.
          if (!pending.txHash && mapped.txHash) {
            await prisma.transaction.update({
              where: { id: pending.id },
              data: {
                txHash: mapped.txHash,
                explorerUrl: mapped.explorerUrl ?? null,
                circleTransactionId: tx.id,
              },
            });
          }
          continue;
        }
      }
    }

    // Resolve the counterparty's display label so the activity row reads
    // "Received from @khadee" / "Sent to 0xab…cd" instead of just "Received USDC".
    // Only used when no row exists yet — recordTransaction preserves the
    // existing title if /api/send already wrote one.
    let title = mapped.title;
    let counterpartyLabel: string | undefined;
    if (mapped.kind === "receive" && tx.sourceAddress) {
      const sender = await findUserByWalletAddress(tx.sourceAddress);
      counterpartyLabel = sender?.username
        ? `@${sender.username}`
        : sender?.displayName?.trim() ||
          shortenAddress(tx.sourceAddress, 6);
      title = `Received from ${counterpartyLabel}`;
    } else if (mapped.kind === "send" && tx.destinationAddress) {
      const recipient = await findUserByWalletAddress(tx.destinationAddress);
      counterpartyLabel = recipient?.username
        ? `@${recipient.username}`
        : recipient?.displayName?.trim() ||
          shortenAddress(tx.destinationAddress, 6);
      title = `Sent to ${counterpartyLabel}`;
    }

    const { row, isNew } = await recordTransaction({
      userId,
      kind: mapped.kind ?? "send",
      title,
      amountLabel: mapped.amount,
      variant: mapped.variant,
      status: mapped.status,
      circleTransactionId: tx.id,
      txHash: mapped.txHash,
      explorerUrl: mapped.explorerUrl,
      chain: tx.blockchain,
      metadata:
        mapped.kind === "receive"
          ? {
              token,
              ...(tx.sourceAddress ? { fromAddress: tx.sourceAddress } : {}),
              ...(counterpartyLabel ? { sender: counterpartyLabel } : {}),
            }
          : {
              token,
              ...(tx.destinationAddress
                ? { recipientAddress: tx.destinationAddress }
                : {}),
              ...(counterpartyLabel
                ? { recipient: counterpartyLabel }
                : {}),
            },
    });

    if (
      isNew &&
      mapped.kind === "receive" &&
      !row.pushNotified &&
      mapped.variant === "credit"
    ) {
      try {
        await notifyIncomingPayment(
          userId,
          mapped.amount,
          row.id,
          tx.sourceAddress,
          token,
        );
      } catch (err) {
        console.error("[Glide] push notify:", err);
      }
    }
  }

  return circleTxs.map(mapCircleTransaction);
}
