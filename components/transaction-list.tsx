"use client";

import { usePrivacy } from "@/context/privacy-context";
import type { GlideTransaction, TransactionKind } from "@/lib/types";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Link2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const KIND_VISUALS: Record<
  TransactionKind,
  { Icon: LucideIcon; bg: string; ring: string }
> = {
  send: {
    Icon: ArrowUpRight,
    bg: "rgba(59,130,246,0.18)",
    ring: "rgba(59,130,246,0.35)",
  },
  receive: {
    Icon: ArrowDownLeft,
    bg: "rgba(74,222,128,0.18)",
    ring: "rgba(74,222,128,0.35)",
  },
  swap: {
    Icon: ArrowLeftRight,
    bg: "rgba(251,191,36,0.18)",
    ring: "rgba(251,191,36,0.35)",
  },
  bridge: {
    Icon: Link2,
    bg: "rgba(168,85,247,0.18)",
    ring: "rgba(168,85,247,0.35)",
  },
};

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
  // compiling — the new Spendly-style row is the same shape on both pages,
  // so these are intentionally not used in the new visual.
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
      ? "text-[#16A34A] dark:text-[#4ADE80]"
      : tx.variant === "debit"
        ? "text-[#DC2626] dark:text-[#F87171]"
        : "text-[color:var(--glide-on-elevated-variant)]";

  return (
    <article
      className="flex items-center gap-3 rounded-2xl border bg-[color:var(--glide-surface-elevated)] p-3.5"
      style={{ borderColor: "var(--glide-elevated-border)" }}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{
          backgroundColor: v.bg,
          boxShadow: `inset 0 0 0 1px ${v.ring}`,
        }}
      >
        <Icon
          className="h-4 w-4 text-[color:var(--glide-on-elevated)]"
          strokeWidth={2.25}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[color:var(--glide-on-elevated)]">
          {tx.title}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-[color:var(--glide-on-elevated-variant)]">
          {tx.meta}
        </p>
      </div>
      <p
        className={`shrink-0 font-display text-sm font-bold tabular-nums ${amountColor} ${
          blurAmounts ? "glide-amount-blur" : ""
        }`}
      >
        {blurAmounts ? "•••" : tx.amount}
      </p>
    </article>
  );
}
