"use client";

import { usePrivacy } from "@/context/privacy-context";
import type { GlideTransaction, TransactionKind } from "@/lib/types";
import { ArrowDown, ArrowLeftRight, ArrowUp, Link2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const KIND_VISUALS: Record<
  TransactionKind,
  { Icon: LucideIcon; iconBg: string; iconColor: string }
> = {
  send: {
    Icon: ArrowUp,
    iconBg: "color-mix(in srgb, var(--glide-error) 12%, transparent)",
    iconColor: "var(--glide-error)",
  },
  receive: {
    Icon: ArrowDown,
    iconBg: "var(--glide-success-container)",
    iconColor: "var(--glide-success)",
  },
  swap: {
    Icon: ArrowLeftRight,
    iconBg: "var(--glide-primary-container)",
    iconColor: "var(--glide-primary)",
  },
  bridge: {
    Icon: Link2,
    iconBg: "rgba(251,191,36,0.12)",
    iconColor: "#F59E0B",
  },
};

const KIND_TITLE: Record<TransactionKind, string> = {
  send: "Sent",
  receive: "Received",
  swap: "Swapped",
  bridge: "Bridged",
};

/** Compact relative time: "Just now", "2m ago", "1h ago", "Yesterday", "Mar 4". */
function formatRelativeTime(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const ADDR_RE = /0x[a-fA-F0-9]{40}/;

function shortHex(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

/** Build the row subtitle from a transaction. Prefer the existing tx.meta. */
function buildSubtitle(tx: GlideTransaction): string {
  if (tx.meta && tx.meta.trim().length > 0) {
    // Shorten any embedded hex address found in the existing meta string so it
    // matches the 0x123456...abcd format used in the new design.
    return tx.meta.replace(ADDR_RE, (m) => shortHex(m));
  }
  const counterparty = tx.counterparty?.trim();
  if (counterparty) {
    const pretty = ADDR_RE.test(counterparty)
      ? shortHex(counterparty)
      : counterparty;
    if (tx.kind === "receive") return `From ${pretty}`;
    if (tx.kind === "send") return `To ${pretty}`;
    return pretty;
  }
  if (tx.kind === "bridge" && tx.originChain) {
    return `From ${tx.originChain}`;
  }
  return "";
}

function buildTitle(tx: GlideTransaction): string {
  // Prefer the richer existing title (e.g. "Received from @fifi") when present.
  if (tx.title && tx.title.trim().length > 0) return tx.title;
  if (tx.kind) return KIND_TITLE[tx.kind];
  return "Activity";
}

function TransactionSkeleton() {
  return (
    <ul className="flex flex-col gap-2.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="h-[68px] animate-pulse rounded-2xl border bg-[color:var(--glide-surface-elevated)]"
          style={{ borderColor: "var(--glide-elevated-border)" }}
        />
      ))}
    </ul>
  );
}

export function TransactionList({
  transactions,
  loading = false,
  emptyMessage = "No activity yet",
  // Kept in the prop signature so existing callers (activity-feed) keep
  // compiling — the row visual is the same on both pages.
  showTime: _showTime = false,
  grouped = false,
}: {
  transactions: GlideTransaction[];
  loading?: boolean;
  emptyMessage?: string;
  showTime?: boolean;
  grouped?: boolean;
}) {
  if (loading && transactions.length === 0) {
    return <TransactionSkeleton />;
  }

  if (transactions.length === 0 && !grouped) {
    return (
      <div
        className="rounded-2xl border bg-[color:var(--glide-surface-elevated)] p-6 text-center text-sm text-[color:var(--glide-on-elevated-variant)]"
        style={{ borderColor: "var(--glide-elevated-border)" }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {transactions.map((tx) => (
        <li key={`${tx.id}-${tx.createdAt ?? ""}`}>
          <TransactionRow tx={tx} />
        </li>
      ))}
    </ul>
  );
}

function TransactionRow({ tx }: { tx: GlideTransaction }) {
  const { blurAmounts } = usePrivacy();
  const v = (tx.kind && KIND_VISUALS[tx.kind]) || KIND_VISUALS.send;
  const Icon = v.Icon;

  const amountColor =
    tx.variant === "credit"
      ? "var(--glide-success)"
      : tx.variant === "debit"
        ? "var(--glide-error)"
        : "var(--glide-primary)";

  const title = buildTitle(tx);
  const subtitle = buildSubtitle(tx);
  const relativeTime = formatRelativeTime(tx.createdAt);

  return (
    <article
      className="flex items-center gap-3 rounded-2xl border bg-[color:var(--glide-surface-elevated)] p-3.5"
      style={{ borderColor: "var(--glide-elevated-border)" }}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: v.iconBg }}
      >
        <Icon
          className="h-4 w-4"
          style={{ color: v.iconColor }}
          strokeWidth={2.5}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[color:var(--glide-on-elevated)]">
          {title}
        </p>
        {subtitle ? (
          <p className="mt-0.5 truncate text-xs text-[color:var(--glide-on-elevated-variant)]">
            {subtitle}
          </p>
        ) : null}
      </div>
      <div className="shrink-0 text-right">
        <p
          className={`text-sm font-bold tabular-nums ${
            blurAmounts ? "glide-amount-blur" : ""
          }`}
          style={{ color: amountColor }}
        >
          {blurAmounts ? "•••" : tx.amount}
        </p>
        {relativeTime ? (
          <p className="mt-0.5 text-xs text-[color:var(--glide-on-elevated-variant)]">
            {relativeTime}
          </p>
        ) : null}
      </div>
    </article>
  );
}
