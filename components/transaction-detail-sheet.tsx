"use client";

import { copyText } from "@/lib/clipboard";
import type { GlideTransaction } from "@/lib/types";
import { ExternalLink, Share2, X } from "lucide-react";
import { useEffect, useState } from "react";

export function TransactionDetailSheet({
  transaction,
  onClose,
}: {
  transaction: GlideTransaction | null;
  onClose: () => void;
}) {
  const [shareLabel, setShareLabel] = useState("Share");

  useEffect(() => {
    if (!transaction) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [transaction, onClose]);

  if (!transaction) return null;

  const { title, amount, variant, meta, status, explorerUrl, txHash, note } =
    transaction;
  const isCredit = variant === "credit";

  const shareText = [title, amount, txHash ? `Tx: ${txHash}` : null, explorerUrl ?? null]
    .filter(Boolean)
    .join("\n");

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "glidepay transaction",
          text: shareText,
          url: explorerUrl,
        });
        return;
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
      }
    }
    const ok = await copyText(explorerUrl ?? txHash ?? shareText);
    if (!ok) return;
    setShareLabel("Copied");
    window.setTimeout(() => setShareLabel("Share"), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tx-detail-title"
        className="relative z-10 w-full max-w-md rounded-t-3xl bg-white px-6 pb-8 pt-5 shadow-xl dark:bg-[#141416] sm:rounded-3xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="tx-detail-title" className="text-lg font-semibold tracking-tight">
            Transaction
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 dark:bg-[#1c1c1e] dark:text-white/70"
            aria-label="Close details"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-[15px] font-semibold text-neutral-950 dark:text-white">{title}</p>
        <p
          className={`mt-2 text-2xl font-bold tracking-tight ${
            isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-950 dark:text-white"
          }`}
        >
          {amount}
        </p>
        <p className="mt-1 text-sm text-neutral-500 dark:text-white/45">
          {meta}
          {status ? ` · ${status}` : ""}
        </p>
        {note ? (
          <p className="mt-3 rounded-xl bg-neutral-100 px-4 py-3 text-sm dark:bg-[#1c1c1e]">
            &ldquo;{note}&rdquo;
          </p>
        ) : null}

        {txHash ? (
          <div className="mt-5 rounded-2xl bg-neutral-100 px-4 py-3 dark:bg-[#1c1c1e]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-neutral-500 dark:text-white/45">
              Transaction hash
            </p>
            <p className="mt-1 break-all font-mono text-xs text-neutral-800 dark:text-white/80">
              {txHash}
            </p>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-2">
          {explorerUrl ? (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-neutral-950 py-3.5 text-sm font-semibold text-white dark:bg-white dark:text-neutral-950"
            >
              <ExternalLink className="h-4 w-4" />
              View on Arc explorer
            </a>
          ) : null}
          {(explorerUrl || txHash) && (
            <button
              type="button"
              onClick={() => void handleShare()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-neutral-200 py-3.5 text-sm font-semibold text-neutral-900 dark:border-white/15 dark:text-white"
            >
              <Share2 className="h-4 w-4" />
              {shareLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
