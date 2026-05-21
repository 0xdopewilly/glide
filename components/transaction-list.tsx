"use client";

import { activityRowMeta } from "@/lib/activity";
import { usePrivacy } from "@/context/privacy-context";
import type { GlideTransaction, TransactionKind } from "@/lib/types";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  ChevronDown,
  ExternalLink,
  Link2,
  Share2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";

const KIND_ICON: Record<TransactionKind, LucideIcon> = {
  send: ArrowUpRight,
  receive: ArrowDownLeft,
  swap: ArrowLeftRight,
  bridge: Link2,
};

function TransactionSkeleton() {
  return (
    <ul className="flex flex-col gap-2" aria-hidden>
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="h-[3.75rem] animate-pulse rounded-2xl bg-neutral-100/80 dark:bg-[#1c1c1e]"
        />
      ))}
    </ul>
  );
}

export function TransactionList({
  transactions,
  loading = false,
  emptyMessage = "No activity yet",
  showTime = false,
  grouped = false,
}: {
  transactions: GlideTransaction[];
  loading?: boolean;
  emptyMessage?: string;
  showTime?: boolean;
  grouped?: boolean;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading && transactions.length === 0) {
    return <TransactionSkeleton />;
  }

  if (transactions.length === 0 && !grouped) {
    return (
      <p className="rounded-2xl px-4 py-10 text-center text-sm font-medium glide-muted glide-surface-card">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {transactions.map((item) => (
        <li key={`${item.id}-${item.createdAt ?? ""}`}>
          <TransactionRow
            tx={item}
            expanded={expandedId === item.id}
            showTime={showTime}
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
  showTime,
  onToggle,
}: {
  tx: GlideTransaction;
  expanded: boolean;
  showTime?: boolean;
  onToggle: () => void;
}) {
  const { title, amount, variant, status, explorerUrl, txHash, note, kind } = tx;
  const isCredit = variant === "credit";
  const { blurAmounts } = usePrivacy();
  const [shareLabel, setShareLabel] = useState("Share");
  const Icon = kind ? KIND_ICON[kind] : ArrowUpRight;
  const subtitle = showTime ? activityRowMeta(tx) : [tx.meta, status].filter(Boolean).join(" · ");

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
      className={`overflow-hidden rounded-2xl transition-shadow duration-200 glide-surface-card ${
        expanded ? "shadow-md ring-1 ring-black/5 dark:ring-white/10" : ""
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="glide-tap flex w-full items-center gap-3 px-3.5 py-3 text-left"
        aria-expanded={expanded}
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            isCredit
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "bg-neutral-100 text-neutral-700 dark:bg-white/10 dark:text-white/80"
          }`}
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={2.25} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold tracking-tight text-neutral-950 dark:text-white">
            {title}
          </p>
          <p className="mt-0.5 truncate text-xs font-medium capitalize glide-muted">
            {subtitle}
          </p>
          {note && !expanded ? (
            <p className="mt-0.5 truncate text-xs text-neutral-400 dark:text-white/35">
              {note}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <p
            className={`text-[15px] font-semibold tabular-nums tracking-tight ${
              isCredit
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-neutral-950 dark:text-white"
            } ${blurAmounts ? "glide-amount-blur" : ""}`}
          >
            {blurAmounts ? "•••" : amount}
          </p>
          <span
            className={`inline-flex text-neutral-400 transition-transform duration-200 dark:text-white/35 ${
              expanded ? "rotate-180" : ""
            }`}
          >
            <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
          </span>
        </div>
      </button>

      {expanded ? (
            <div className="overflow-hidden border-t border-[var(--glide-border)]">
            <div className="px-4 pb-4 pt-3">
              {note ? (
                <p className="rounded-xl bg-neutral-100/80 px-3 py-2.5 text-sm dark:bg-black/30">
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
                    className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3.5 py-2 text-[11px] font-semibold tracking-tight text-neutral-700 dark:bg-white/10 dark:text-white/80"
                  >
                    <Share2 className="h-3 w-3" />
                    {shareLabel}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
    </article>
  );
}
