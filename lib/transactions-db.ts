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
      // PRESERVE the existing amountLabel/title. /api/send writes them with the
      // correct token (USDC / EURC / cirBTC); Circle sync infers and can default
      // to the wrong token when Circle omits the symbol. Never let sync clobber
      // a manually-recorded label.
      const row = await prisma.transaction.update({
        where: { id: existing.id },
        data: {
          status: input.status ?? existing.status,
          txHash: input.txHash ?? existing.txHash,
          explorerUrl: input.explorerUrl ?? existing.explorerUrl,
          amountLabel: existing.amountLabel || input.amountLabel,
          title: existing.title || input.title,
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
      // Same rule for the txHash-matched path: keep the user-visible labels.
      const row = await prisma.transaction.update({
        where: { id: existing.id },
        data: {
          status: input.status ?? existing.status,
          explorerUrl: input.explorerUrl ?? existing.explorerUrl,
          circleTransactionId:
            existing.circleTransactionId ?? input.circleTransactionId,
          amountLabel: existing.amountLabel || input.amountLabel,
          title: existing.title || input.title,
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
