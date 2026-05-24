"use client";

import { TransactionReceiptSheet } from "@/components/transaction-receipt-sheet";
import { activityRowMeta } from "@/lib/activity";
import { copyText } from "@/lib/clipboard";
import { usePrivacy } from "@/context/privacy-context";
import type { GlideTransaction, TransactionKind } from "@/lib/types";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  ChevronDown,
  Copy,
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
          className="h-[3.75rem] animate-pulse rounded-2xl"
          style={{ background: "var(--glide-surface-container)" }}
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
      <p
        className="rounded-2xl border px-4 py-10 text-center text-sm font-medium text-[var(--glide-muted)]"
        style={{
          background: "var(--glide-surface-elevated)",
          borderColor: "var(--glide-border)",
        }}
      >
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
  const [hashCopied, setHashCopied] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const Icon = kind ? KIND_ICON[kind] : ArrowUpRight;
  const subtitle = showTime
    ? activityRowMeta(tx)
    : [tx.meta, status].filter(Boolean).join(" · ");

  const openReceipt = (e: React.MouseEvent) => {
    e.stopPropagation();
    setReceiptOpen(true);
  };

  const copyHash = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!txHash) return;
    const ok = await copyText(txHash);
    if (!ok) return;
    setHashCopied(true);
    window.setTimeout(() => setHashCopied(false), 2000);
  };

  const canShare = Boolean(explorerUrl || txHash);

  return (
    <article
      className="overflow-hidden rounded-2xl border transition-all"
      style={{
        background: expanded
          ? "var(--glide-surface-elevated)"
          : "var(--glide-surface-container)",
        borderColor: expanded
          ? "color-mix(in srgb, var(--glide-text) 14%, transparent)"
          : "var(--glide-border)",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="glide-tap flex w-full items-center gap-3.5 px-4 py-4 text-left"
        aria-expanded={expanded}
      >
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          style={
            isCredit
              ? {
                  background: "var(--glide-success-container)",
                  color: "var(--glide-success)",
                }
              : {
                  background: "var(--glide-surface-container-high)",
                  color: "var(--glide-text)",
                }
          }
        >
          <Icon className="h-[19px] w-[19px]" strokeWidth={2.5} />
        </span>

        <div className="min-w-0 flex-1">
          <p
            className="truncate text-[15px] font-bold tracking-tight"
            style={{ color: "var(--glide-text)" }}
          >
            {title}
          </p>
          <p className="mt-0.5 truncate text-[12px] font-medium capitalize text-[var(--glide-muted)]">
            {subtitle}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <p
            className={`text-[16px] font-bold tabular-nums tracking-tight ${
              blurAmounts ? "glide-amount-blur" : ""
            }`}
            style={
              isCredit
                ? { color: "var(--glide-success)" }
                : { color: "var(--glide-text)" }
            }
          >
            {blurAmounts ? "•••" : amount}
          </p>
          <span
            className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[var(--glide-muted)] transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
            style={{ background: "var(--glide-surface-container-high)" }}
          >
            <ChevronDown className="h-3 w-3" strokeWidth={2.5} />
          </span>
        </div>
      </button>

      {expanded ? (
        <div
          className="overflow-hidden border-t"
          style={{ borderColor: "var(--glide-border)" }}
        >
          <div className="glide-chat-enter px-4 pb-4 pt-3.5">
            {note ? (
              <p
                className="rounded-xl border px-3 py-2.5 text-sm italic"
                style={{
                  background: "var(--glide-surface-container)",
                  borderColor: "var(--glide-border)",
                  color: "var(--glide-text)",
                }}
              >
                &ldquo;{note}&rdquo;
              </p>
            ) : null}

            {txHash ? (
              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <p className="glide-label-mono text-[10px] font-bold text-[var(--glide-muted)]">
                    Transaction hash
                  </p>
                  <button
                    type="button"
                    onClick={copyHash}
                    className="glide-tap glide-label-mono inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{
                      background: "var(--glide-surface-container)",
                      color: "var(--glide-text)",
                    }}
                  >
                    <Copy className="h-3 w-3" strokeWidth={2.25} />
                    {hashCopied ? "Copied" : "Copy"}
                  </button>
                </div>
                <p
                  className="mt-1.5 break-all rounded-xl border px-3 py-2 font-mono text-[11px] leading-relaxed"
                  style={{
                    background: "var(--glide-surface-container)",
                    borderColor: "var(--glide-border)",
                    color: "var(--glide-muted)",
                  }}
                >
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
                  className="glide-tap glide-label-mono inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-bold"
                  style={{
                    background: "var(--glide-accent)",
                    color: "var(--glide-bg)",
                  }}
                >
                  <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Explorer
                </a>
              ) : null}
              {canShare ? (
                <button
                  type="button"
                  onClick={openReceipt}
                  className="glide-tap glide-label-mono inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[11px] font-bold"
                  style={{
                    background: "var(--glide-surface-container)",
                    borderColor: "var(--glide-border)",
                    color: "var(--glide-text)",
                  }}
                >
                  <Share2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Receipt
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      <TransactionReceiptSheet
        tx={tx}
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
      />
    </article>
  );
}
