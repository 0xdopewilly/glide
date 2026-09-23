import { runSaveRulesForReceive } from "@/lib/automations";
import {
  createCircleClient,
  GLIDE_BLOCKCHAIN,
  resolveCircleToken,
} from "@/lib/circle";
import { formatStableAmount } from "@/lib/currency-format";
import { prisma } from "@/lib/db";
import { notifyIncomingPayment } from "@/lib/push";
import { classifyArcToken } from "@/lib/tokens";
import {
  arcExplorerUrl,
  isRowUpToDate,
  recordTransaction,
} from "@/lib/transactions-db";
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
  tokenId?: string;
};

function inferKind(tx: CircleTx): TransactionKind {
  const type = tx.transactionType?.toLowerCase() ?? "";
  if (type.includes("inbound") || type.includes("receive")) return "receive";
  return "send";
}

type ArcToken = "USDC" | "EURC" | "cirBTC";

/** Which supported Arc token a Circle transaction moved, by contract address
 * via its tokenId — or null for anything else (contract calls, other chains,
 * and airdropped look-alike tokens, which on mainnet routinely claim to be
 * "USDC"). Null rows are never recorded, notified, or fed to automations. */
async function resolveArcToken(tokenId: string): Promise<ArcToken | null> {
  try {
    const info = await resolveCircleToken(tokenId);
    if (!info || info.blockchain !== GLIDE_BLOCKCHAIN) return null;
    return classifyArcToken(info);
  } catch (err) {
    // Skip for now; the next sync retries (failed lookups aren't cached).
    console.warn("[Glide] token lookup:", err);
    return null;
  }
}

export function mapCircleTransaction(
  tx: CircleTx,
  token: ArcToken,
): GlideTransaction {
  const amountRaw = tx.amounts?.[0] ?? "0";
  const amountNum = parseFloat(amountRaw);
  const kind = inferKind(tx);
  const isCredit = kind === "receive";

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

/** Magnitude of a display amount ("+$12.50", "−€3", "+₿0.0003"). */
function labelMagnitude(label: string | null | undefined): number {
  const n = parseFloat((label ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function sameAmount(a: string | null | undefined, b: string | null | undefined) {
  return Math.abs(labelMagnitude(a) - labelMagnitude(b)) < 1e-9;
}

function metadataOf(row: { metadata: unknown }): Record<string, unknown> {
  return row.metadata && typeof row.metadata === "object"
    ? (row.metadata as Record<string, unknown>)
    : {};
}

/** Auto-save on an incoming payment. Safe on the spending wallet only,
 * idempotent per (rule, row), and never throws — a rule failure can't break
 * transaction sync. */
async function runSaveRulesSafely(input: {
  userId: string;
  walletId: string;
  amountLabel: string;
  token: ArcToken;
  sourceRef: string;
  fromAddress?: string;
}) {
  try {
    await runSaveRulesForReceive({
      userId: input.userId,
      walletId: input.walletId,
      receivedAmount: labelMagnitude(input.amountLabel),
      token: input.token,
      sourceRef: input.sourceRef,
      fromAddress: input.fromAddress,
    });
  } catch (err) {
    console.error("[Glide] auto-save trigger:", err);
  }
}

/** Mirror Circle's recent transactions for one wallet into Activity.
 *
 * Runs on every 30s poll, so everything it might match is loaded up front in
 * one parallel batch and unchanged rows are not rewritten. Matching order per
 * Circle transaction:
 *   1. existing row (by Circle id, then txHash) — update only if changed;
 *   2. Universal Receive sweep tail — the webhook already recorded it;
 *   3. the mirror row /api/send wrote for a glidepay-to-glidepay payment —
 *      adopt it (it already pushed), so the recipient never gets a second
 *      credit or a second push;
 *   4. otherwise a new row: record, push, and run auto-save. */
export async function syncCircleTransactionsToDb(
  userId: string,
  walletId: string,
): Promise<GlideTransaction[]> {
  const circleTxs = await fetchCircleTransactions(walletId);

  // Resolve each distinct token once, in parallel (cached per instance).
  const tokenIds = [
    ...new Set(circleTxs.map((t) => t.tokenId).filter((id): id is string => !!id)),
  ];
  const tokenById = new Map<string, ArcToken | null>();
  await Promise.all(
    tokenIds.map(async (id) => {
      tokenById.set(id, await resolveArcToken(id));
    }),
  );

  // Oldest first, so repeated identical payments pair with their mirrors
  // in order.
  const items = circleTxs
    .flatMap((tx) => {
      const token = tx.tokenId ? tokenById.get(tx.tokenId) : null;
      return token ? [{ tx, token, mapped: mapCircleTransaction(tx, token) }] : [];
    })
    .sort((a, b) => (a.tx.createDate ?? "").localeCompare(b.tx.createDate ?? ""));
  if (items.length === 0) return [];

  const circleIds = items.map((i) => i.tx.id);
  const hashes = items
    .map((i) => i.mapped.txHash)
    .filter((h): h is string => !!h);
  const counterpartyAddresses = [
    ...new Set(
      items
        .map((i) =>
          (i.mapped.kind === "receive"
            ? i.tx.sourceAddress
            : i.tx.destinationAddress
          )?.toLowerCase(),
        )
        .filter((a): a is string => !!a?.startsWith("0x")),
    ),
  ];
  const since15m = new Date(Date.now() - 15 * 60 * 1000);
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [byCircleIdRows, byHashRows, sweepClaims, mirrorRows, counterpartyRows] =
    await Promise.all([
      prisma.transaction.findMany({
        where: { userId, circleTransactionId: { in: circleIds } },
      }),
      hashes.length
        ? prisma.transaction.findMany({ where: { userId, txHash: { in: hashes } } })
        : Promise.resolve([]),
      // Universal Receive claims that the Arc-side mint may belong to.
      prisma.transaction.findMany({
        where: { userId, originChain: { not: null }, createdAt: { gte: since15m } },
        orderBy: { createdAt: "asc" },
      }),
      // Mirror rows /api/send wrote for payments from other glidepay users.
      prisma.transaction.findMany({
        where: {
          userId,
          kind: "receive",
          originChain: null,
          circleTransactionId: null,
          createdAt: { gte: since24h },
        },
        orderBy: { createdAt: "asc" },
      }),
      counterpartyAddresses.length
        ? prisma.user.findMany({
            where: {
              OR: counterpartyAddresses.map((a) => ({
                circleWalletAddress: { equals: a, mode: "insensitive" as const },
              })),
            },
            select: { username: true, displayName: true, circleWalletAddress: true },
          })
        : Promise.resolve([]),
    ]);

  const byCircleId = new Map(byCircleIdRows.map((r) => [r.circleTransactionId, r]));
  const byHash = new Map<string, (typeof byHashRows)[number]>();
  for (const r of byHashRows) if (r.txHash && !byHash.has(r.txHash)) byHash.set(r.txHash, r);
  const counterpartyByAddress = new Map(
    counterpartyRows.map((u) => [u.circleWalletAddress?.toLowerCase(), u]),
  );
  const usedRows = new Set<string>();
  const synced: GlideTransaction[] = [];

  for (const { tx, token, mapped } of items) {
    synced.push(mapped);
    const isReceive = mapped.kind === "receive";
    const existing =
      byCircleId.get(tx.id) ?? (mapped.txHash ? byHash.get(mapped.txHash) : undefined);

    // Universal Receive: the Arc-side mint of a CCTP sweep. The webhook
    // already created the activity row + fired the push.
    if (isReceive && existing?.originChain) continue;
    if (isReceive && !existing) {
      const claim = sweepClaims.find(
        (c) =>
          !usedRows.has(c.id) &&
          sameAmount(c.amountLabel, mapped.amount) &&
          (!c.txHash || c.txHash === mapped.txHash),
      );
      if (claim) {
        usedRows.add(claim.id);
        // Adopt the Arc-side mint so future syncs match via txHash.
        if (!claim.txHash && mapped.txHash) {
          await prisma.transaction.update({
            where: { id: claim.id },
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

    // A payment from another glidepay user: adopt the mirror row instead of
    // creating a second credit. It already pushed; auto-save runs once here
    // (first time sync sees it), exactly as for any other new receive.
    const mirror =
      isReceive &&
      (existing
        ? !existing.circleTransactionId && metadataOf(existing).fromUserId
          ? existing
          : undefined
        : mirrorRows.find(
            (m) =>
              !usedRows.has(m.id) &&
              typeof metadataOf(m).fromUserId === "string" &&
              sameAmount(m.amountLabel, mapped.amount) &&
              String(metadataOf(m).fromAddress ?? "").toLowerCase() ===
                (tx.sourceAddress ?? "").toLowerCase(),
          ));
    if (mirror) {
      usedRows.add(mirror.id);
      await prisma.transaction.update({
        where: { id: mirror.id },
        data: {
          circleTransactionId: tx.id,
          status: mapped.status ?? mirror.status,
          txHash: mapped.txHash ?? mirror.txHash,
          explorerUrl: mapped.explorerUrl ?? mirror.explorerUrl,
        },
      });
      if (mapped.variant === "credit") {
        await runSaveRulesSafely({
          userId,
          walletId,
          amountLabel: mapped.amount,
          token,
          sourceRef: mirror.id,
          fromAddress: tx.sourceAddress ?? undefined,
        });
      }
      continue;
    }

    // Resolve the counterparty's display label so the activity row reads
    // "Received from @khadee" / "Sent to 0xab…cd" instead of just "Received USDC".
    // Only used when no row exists yet — recordTransaction preserves the
    // existing title if /api/send already wrote one.
    const counterpartyAddress = isReceive ? tx.sourceAddress : tx.destinationAddress;
    let title = mapped.title;
    let counterpartyLabel: string | undefined;
    if (counterpartyAddress) {
      const who = counterpartyByAddress.get(counterpartyAddress.toLowerCase());
      counterpartyLabel = who?.username
        ? `@${who.username}`
        : who?.displayName?.trim() || shortenAddress(counterpartyAddress, 6);
      title = `${isReceive ? "Received from" : "Sent to"} ${counterpartyLabel}`;
    }

    const input = {
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
      metadata: isReceive
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
            ...(counterpartyLabel ? { recipient: counterpartyLabel } : {}),
          },
    } satisfies Parameters<typeof recordTransaction>[0];

    // Nothing changed since the last poll: skip the write.
    if (existing && isRowUpToDate(existing, input)) continue;

    const { row, isNew } = await recordTransaction(input);

    if (isNew && isReceive && !row.pushNotified && mapped.variant === "credit") {
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

    if (isNew && isReceive && mapped.variant === "credit") {
      await runSaveRulesSafely({
        userId,
        walletId,
        amountLabel: mapped.amount,
        token,
        sourceRef: row.id,
        fromAddress: tx.sourceAddress ?? undefined,
      });
    }
  }

  return synced;
}
