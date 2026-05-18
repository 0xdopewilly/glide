"use client";

import type { GlideTransaction } from "@/lib/types";
import { Share2 } from "lucide-react";
import { useState } from "react";

export function TransactionList({
  transactions,
  emptyMessage = "No activity yet",
}: {
  transactions: GlideTransaction[];
  emptyMessage?: string;
}) {
  if (transactions.length === 0) {
    return (
      <p
        className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm font-medium tracking-tight glide-muted"
        style={{ borderColor: "var(--glide-border)" }}
      >
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {transactions.map((item) => (
        <li key={item.id}>
          <TransactionRow {...item} />
        </li>
      ))}
    </ul>
  );
}

function TransactionRow(tx: GlideTransaction) {
  const { title, amount, variant, meta, status, explorerUrl, txHash } = tx;
  const isCredit = variant === "credit";
  const [shareLabel, setShareLabel] = useState("Share");

  const shareText = [
    title,
    amount,
    txHash ? `Tx: ${txHash}` : null,
    explorerUrl ?? null,
  ]
    .filter(Boolean)
    .join("\n");

  const handleShare = async () => {
    if (!explorerUrl && !txHash) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Glide transaction",
          text: shareText,
          url: explorerUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(explorerUrl ?? txHash ?? shareText);
      setShareLabel("Copied");
      window.setTimeout(() => setShareLabel("Share"), 2000);
    } catch {
      if (explorerUrl) {
        window.open(explorerUrl, "_blank", "noopener,noreferrer");
      }
    }
  };

  const canShare = Boolean(explorerUrl || txHash);

  return (
    <article
      className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 ${
        isCredit ? "border-emerald-500/30 bg-emerald-500/10" : "glide-surface-card shadow-sm"
      }`}
    >
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-[15px] font-medium tracking-tight">{title}</p>
        <p className="mt-0.5 text-xs font-medium glide-muted">
          {meta}
          {status ? ` · ${status}` : ""}
        </p>
        {txHash ? (
          <p className="mt-1 truncate font-mono text-[10px] glide-muted">{txHash}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <p
          className={`text-[15px] font-semibold tracking-tight ${
            isCredit ? "text-emerald-600 dark:text-emerald-400" : ""
          }`}
          style={isCredit ? undefined : { color: "var(--glide-text)" }}
        >
          {amount}
        </p>
        {canShare ? (
          <button
            type="button"
            onClick={() => void handleShare()}
            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-tight transition-colors hover:opacity-80"
            style={{
              borderColor: "var(--glide-border)",
              color: "var(--glide-text)",
            }}
            aria-label="Share transaction"
          >
            <Share2 className="h-3 w-3" />
            {shareLabel}
          </button>
        ) : null}
      </div>
    </article>
  );
}
