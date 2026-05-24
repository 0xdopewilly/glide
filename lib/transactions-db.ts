import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { formatRelativeDate } from "@/lib/format";
import type { GlideTransaction, TransactionKind } from "@/lib/types";

export type RecordTransactionInput = {
  userId: string;
  kind: TransactionKind;
  title: string;
  amountLabel: string;
  variant: GlideTransaction["variant"];
  status?: string;
  circleTransactionId?: string;
  txHash?: string;
  explorerUrl?: string;
  chain?: string;
  metadata?: Prisma.InputJsonValue;
};

/** Extract the numeric magnitude from a label like "−$0.00" / "+₿0.0003". */
function labelToNumber(label: string | null | undefined): number {
  if (!label) return 0;
  const cleaned = label.replace(/[^0-9.]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** A title is "broken" if it lacks a counterparty (no " to " / " from "). */
function titleHasCounterparty(title: string | null | undefined): boolean {
  if (!title) return false;
  return /\b(to|from)\s+\S/i.test(title);
}

/**
 * Decide whether sync's value should overwrite the stored one.
 * Rule: keep the stored value unless it's clearly broken (zero amount when
 * Circle reports a real amount, or a generic title when sync produced a
 * counterparty-aware one). This heals rows written by the pre-fix code.
 */
function pickAmountLabel(existing: string | null, incoming: string): string {
  const existingValue = labelToNumber(existing);
  const incomingValue = labelToNumber(incoming);
  if (!existing) return incoming;
  if (existingValue === 0 && incomingValue > 0) return incoming;
  return existing;
}

function pickTitle(existing: string | null, incoming: string): string {
  if (!existing) return incoming;
  if (!titleHasCounterparty(existing) && titleHasCounterparty(incoming)) {
    return incoming;
  }
  return existing;
}

function mergeMetadata(
  existing: unknown,
  incoming: Prisma.InputJsonValue | undefined,
): Prisma.InputJsonValue | undefined {
  if (incoming === undefined) return undefined;
  if (existing && typeof existing === "object") {
    return { ...(existing as Record<string, unknown>), ...(incoming as Record<string, unknown>) } as Prisma.InputJsonValue;
  }
  return incoming;
}

export async function recordTransaction(input: RecordTransactionInput) {
  // Look up an existing row for THIS user only. A single Circle transaction
  // creates two activity rows (one per side of the transfer), so the unique
  // identity of a row is (userId, circleTransactionId) — NOT circleTransactionId
  // alone. Looking up globally would let one user's sync overwrite the other
  // user's row (the bug that flipped credits and debits across accounts).
  if (input.circleTransactionId) {
    const existing = await prisma.transaction.findFirst({
      where: {
        userId: input.userId,
        circleTransactionId: input.circleTransactionId,
      },
    });
    if (existing) {
      // Prefer the existing user-visible labels except when they are clearly
      // broken: zero amount when Circle reports a real one, or a generic
      // "Sent USDC" title when we now have "Sent to @khadee".
      const row = await prisma.transaction.update({
        where: { id: existing.id },
        data: {
          status: input.status ?? existing.status,
          txHash: input.txHash ?? existing.txHash,
          explorerUrl: input.explorerUrl ?? existing.explorerUrl,
          amountLabel: pickAmountLabel(existing.amountLabel, input.amountLabel),
          title: pickTitle(existing.title, input.title),
          metadata: mergeMetadata(existing.metadata, input.metadata),
        },
      });
      return { row, isNew: false };
    }
  }

  if (input.txHash) {
    const existing = await prisma.transaction.findFirst({
      where: { userId: input.userId, txHash: input.txHash },
    });
    if (existing) {
      const row = await prisma.transaction.update({
        where: { id: existing.id },
        data: {
          status: input.status ?? existing.status,
          explorerUrl: input.explorerUrl ?? existing.explorerUrl,
          circleTransactionId:
            existing.circleTransactionId ?? input.circleTransactionId,
          amountLabel: pickAmountLabel(existing.amountLabel, input.amountLabel),
          title: pickTitle(existing.title, input.title),
          metadata: mergeMetadata(existing.metadata, input.metadata),
        },
      });
      return { row, isNew: false };
    }
  }

  const row = await prisma.transaction.create({
    data: {
      userId: input.userId,
      kind: input.kind,
      title: input.title,
      amountLabel: input.amountLabel,
      variant: input.variant,
      status: input.status,
      circleTransactionId: input.circleTransactionId,
      txHash: input.txHash,
      explorerUrl: input.explorerUrl,
      chain: input.chain,
      metadata: input.metadata,
    },
  });
  return { row, isNew: true };
}

function metadataNote(metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const note = (metadata as { note?: unknown }).note;
  return typeof note === "string" && note.trim() ? note.trim() : undefined;
}

function metadataCounterparty(
  metadata: unknown,
  kind: string,
): string | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const m = metadata as { recipient?: unknown; sender?: unknown };
  const value = kind === "receive" ? m.sender : m.recipient;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function rowToGlide(row: {
  id: string;
  kind: string;
  title: string;
  amountLabel: string;
  variant: string;
  status: string | null;
  txHash: string | null;
  explorerUrl: string | null;
  metadata: unknown;
  createdAt: Date;
}): GlideTransaction {
  return {
    id: row.txHash ?? row.id,
    title: row.title,
    amount: row.amountLabel,
    variant: row.variant as GlideTransaction["variant"],
    meta: formatRelativeDate(row.createdAt.toISOString()),
    createdAt: row.createdAt.toISOString(),
    kind: row.kind as TransactionKind,
    status: row.status ?? undefined,
    note: metadataNote(row.metadata),
    txHash: row.txHash ?? undefined,
    explorerUrl: row.explorerUrl ?? undefined,
    counterparty: metadataCounterparty(row.metadata, row.kind),
  };
}

export async function listUserTransactions(userId: string, limit = 50) {
  const rows = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(rowToGlide);
}

export function arcExplorerUrl(txHash: string) {
  return `https://testnet.arcscan.app/tx/${txHash}`;
}
