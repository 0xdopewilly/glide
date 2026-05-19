"use client";

import { TransactionDetailSheet } from "@/components/transaction-detail-sheet";
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
  const [selected, setSelected] = useState<GlideTransaction | null>(null);

  if (transactions.length === 0) {
    return (
      <p className="rounded-2xl bg-neutral-100 px-4 py-10 text-center text-sm font-medium tracking-tight text-neutral-500 dark:bg-[#1c1c1e] dark:text-white/40">
        {emptyMessage}
      </p>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {transactions.map((item) => (
          <li key={item.id}>
            <TransactionRow tx={item} onSelect={() => setSelected(item)} />
          </li>
        ))}
      </ul>
      <TransactionDetailSheet
        transaction={selected}
        onClose={() => setSelected(null)}
      />
    </>
  );
}

function TransactionRow({
  tx,
  onSelect,
}: {
  tx: GlideTransaction;
  onSelect: () => void;
}) {
  const { title, amount, variant, meta, status, explorerUrl, txHash } = tx;
  const isCredit = variant === "credit";
  const [shareLabel, setShareLabel] = useState("Share");

  const shareText = [title, amount, txHash ? `Tx: ${txHash}` : null, explorerUrl ?? null]
    .filter(Boolean)
    .join("\n");

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`glide-tap flex cursor-pointer items-center justify-between gap-3 rounded-2xl px-4 py-3.5 transition-opacity hover:opacity-90 ${
        isCredit
          ? "bg-emerald-500/10 ring-1 ring-emerald-500/20 dark:bg-emerald-500/10"
          : "bg-neutral-100 dark:bg-[#1c1c1e]"
      }`}
    >
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-[15px] font-semibold tracking-tight text-neutral-950 dark:text-white">
          {title}
        </p>
        <p className="mt-0.5 text-xs font-medium text-neutral-500 dark:text-white/45">
          {meta}
          {status ? ` · ${status}` : ""}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <p
          className={`text-[15px] font-semibold tracking-tight ${
            isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-950 dark:text-white"
          }`}
        >
          {amount}
        </p>
        {canShare ? (
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold tracking-tight text-neutral-700 transition-opacity hover:opacity-80 dark:bg-black/30 dark:text-white/80"
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
