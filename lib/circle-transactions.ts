import { createCircleClient } from "@/lib/circle";
import { arcExplorerUrl, recordTransaction } from "@/lib/transactions-db";
import { formatRelativeDate } from "@/lib/format";
import type { GlideTransaction, TransactionKind } from "@/lib/types";

type CircleTx = {
  id: string;
  state?: string;
  createDate?: string;
  amounts?: string[];
  destinationAddress?: string;
  transactionType?: string;
  txHash?: string;
  blockchain?: string;
};

function inferKind(tx: CircleTx): TransactionKind {
  const type = tx.transactionType?.toLowerCase() ?? "";
  if (type.includes("inbound") || type.includes("receive")) return "receive";
  return "send";
}

export function mapCircleTransaction(tx: CircleTx): GlideTransaction {
  const amountRaw = tx.amounts?.[0] ?? "0";
  const amountNum = parseFloat(amountRaw);
  const kind = inferKind(tx);
  const isCredit = kind === "receive";

  const txHash = tx.txHash;
  const explorerUrl = txHash ? arcExplorerUrl(txHash) : undefined;

  return {
    id: txHash ?? tx.id,
    title: isCredit
      ? "Received USDC"
      : tx.destinationAddress
        ? `Sent to ${tx.destinationAddress.slice(0, 6)}...${tx.destinationAddress.slice(-4)}`
        : "Transfer",
    amount: `${isCredit ? "+" : "−"}$${Math.abs(amountNum).toFixed(2)}`,
    variant: isCredit ? "credit" : "debit",
    meta: formatRelativeDate(tx.createDate),
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
    const mapped = mapCircleTransaction(tx);
    await recordTransaction({
      userId,
      kind: mapped.kind ?? "send",
      title: mapped.title,
      amountLabel: mapped.amount,
      variant: mapped.variant,
      status: mapped.status,
      circleTransactionId: tx.id,
      txHash: mapped.txHash,
      explorerUrl: mapped.explorerUrl,
      chain: tx.blockchain,
    });
  }

  return circleTxs.map(mapCircleTransaction);
}
