"use client";

import { usePrivacy } from "@/context/privacy-context";
import type { GlideTransaction } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ExternalLink, Share2 } from "lucide-react";
import { useState } from "react";

const EXPAND_EASE = [0.22, 1, 0.36, 1] as const;

function TransactionSkeleton() {
  return (
    <ul className="flex flex-col gap-2" aria-hidden>
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="h-[4.25rem] animate-pulse rounded-2xl bg-neutral-100 dark:bg-[#1c1c1e]"
        />
      ))}
    </ul>
  );
}

export function TransactionList({
  transactions,
  loading = false,
  emptyMessage = "No activity yet",
}: {
  transactions: GlideTransaction[];
  loading?: boolean;
  emptyMessage?: string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading && transactions.length === 0) {
    return <TransactionSkeleton />;
  }

  if (transactions.length === 0) {
    return (
      <p className="rounded-2xl bg-neutral-100 px-4 py-10 text-center text-sm font-medium tracking-tight text-neutral-500 dark:bg-[#1c1c1e] dark:text-white/40">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {transactions.map((item) => (
        <li key={item.id}>
          <TransactionRow
            tx={item}
            expanded={expandedId === item.id}
            onToggle={() =>
              setExpandedId((id) => (id === item.id ? null : item.id))
            }
          />
        </li>
      ))}
    </ul>
  );
}

function TransactionRow({
  tx,
  expanded,
  onToggle,
}: {
  tx: GlideTransaction;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { title, amount, variant, meta, status, explorerUrl, txHash, note } = tx;
  const isCredit = variant === "credit";
  const { blurAmounts } = usePrivacy();
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
      className={`overflow-hidden rounded-2xl transition-shadow duration-200 ${
        expanded ? "shadow-md ring-1 ring-black/5 dark:ring-white/10" : ""
      } ${
        isCredit
          ? "bg-emerald-500/10 ring-1 ring-emerald-500/20 dark:bg-emerald-500/10"
          : "bg-neutral-100 dark:bg-[#1c1c1e]"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="glide-tap flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
        aria-expanded={expanded}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold tracking-tight text-neutral-950 dark:text-white">
            {title}
          </p>
          <p className="mt-0.5 text-xs font-medium text-neutral-500 dark:text-white/45">
            {meta}
            {status ? ` · ${status}` : ""}
          </p>
          {note && !expanded ? (
            <p className="mt-0.5 truncate text-xs text-neutral-400 dark:text-white/35">
              {note}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <p
            className={`text-[15px] font-semibold tracking-tight ${
              isCredit
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-neutral-950 dark:text-white"
            } ${blurAmounts ? "glide-amount-blur" : ""}`}
          >
            {blurAmounts ? "•••" : amount}
          </p>
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.22, ease: EXPAND_EASE }}
            className="text-neutral-400 dark:text-white/35"
          >
            <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
          </motion.span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key="receipt"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: EXPAND_EASE }}
            className="overflow-hidden"
          >
            <div
              className="border-t px-4 pb-4 pt-3 dark:border-white/10"
              style={{ borderColor: "var(--glide-border)" }}
            >
              {note ? (
                <p className="rounded-xl bg-white/60 px-3 py-2.5 text-sm dark:bg-black/30">
                  &ldquo;{note}&rdquo;
                </p>
              ) : null}

              {txHash ? (
                <div className="mt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] glide-muted">
                    Transaction hash
                  </p>
                  <p className="mt-1 break-all font-mono text-[11px] leading-relaxed">
                    {txHash}
                  </p>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                {explorerUrl ? (
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 rounded-full bg-neutral-950 px-3.5 py-2 text-[11px] font-semibold text-white dark:bg-white dark:text-neutral-950"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Explorer
                  </a>
                ) : null}
                {canShare ? (
                  <button
                    type="button"
                    onClick={handleShare}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3.5 py-2 text-[11px] font-semibold tracking-tight text-neutral-700 dark:bg-black/30 dark:text-white/80"
                  >
                    <Share2 className="h-3 w-3" />
                    {shareLabel}
                  </button>
                ) : null}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </article>
  );
}
