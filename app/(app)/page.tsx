"use client";

import { AppHeader } from "@/components/app-header";
import { MoreActionsSheet } from "@/components/more-actions-sheet";
import { SavingsCard } from "@/components/savings-card";
import { TokenBalances } from "@/components/token-balances";
import { TransactionList } from "@/components/transaction-list";
import { usePrivacy } from "@/context/privacy-context";
import { useWallet } from "@/context/wallet-context";
import { netFlowUsd } from "@/lib/tokens";
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  Eye,
  EyeOff,
  MoreHorizontal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

// Hoisted: Intl.NumberFormat construction is the expensive part. Reused
// across renders instead of re-allocated every time.
const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const QUICK_ACTIONS = [
  { href: "/send", label: "Send", icon: ArrowUp },
  { href: "/receive", label: "Receive", icon: ArrowDown },
  { href: "/swap", label: "Swap", icon: ArrowLeftRight },
] as const;

export default function HomePage() {
  const {
    totalUsd,
    tokens,
    loading,
    transactions,
    transactionsLoading,
    error,
    clearError,
    refresh,
  } = useWallet();
  const { hideBalance, setHideBalance } = usePrivacy();
  const [moreOpen, setMoreOpen] = useState(false);
  const closeMore = useCallback(() => setMoreOpen(false), []);

  // Real signed net flow today (received − sent) from activity. Only shown
  // when something moved today.
  const netToday = useMemo(() => netFlowUsd(transactions), [transactions]);
  const netTodayPositive = netToday > 0;
  const showDelta = !hideBalance && Math.abs(netToday) >= 0.005;

  const recentTransactions = transactions.slice(0, 5);

  // Pre-format BEFORE JSX so the number always renders even when totalUsd is
  // 0 or undefined (fixes invisible-balance bug where number went missing).
  const formattedTotalUsd = USD_FORMATTER.format(
    typeof totalUsd === "number" && Number.isFinite(totalUsd) ? totalUsd : 0,
  );

  return (
    <>
      <AppHeader showNotifications />

      <div className="glide-scroll flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-6">
        {error ? (
          <div className="mt-3 rounded-2xl bg-red-500/10 px-3 py-2 text-sm font-medium text-red-700 dark:text-red-300">
            <span className="truncate">{error}</span>
            <button type="button" onClick={clearError} className="ml-2 underline">
              Dismiss
            </button>
          </div>
        ) : null}

        {/* BALANCE */}
        <section className="mt-6 flex shrink-0 flex-col items-center text-center">
          <button
            type="button"
            onClick={() => setHideBalance(!hideBalance)}
            aria-label={hideBalance ? "Show balance" : "Hide balance"}
            aria-pressed={hideBalance}
            className="glide-tap inline-flex items-center gap-1.5 text-[13px] font-medium text-[color:var(--glide-on-surface-variant)]"
          >
            Spendable
            {hideBalance ? (
              <EyeOff className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            ) : (
              <Eye className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            )}
          </button>

          <p
            className="font-display mt-2 text-[44px] font-bold leading-none tracking-tight text-[color:var(--glide-on-surface)] tabular-nums"
            style={{ minHeight: "2.75rem" }}
          >
            {hideBalance ? "••••" : formattedTotalUsd}
          </p>

          {showDelta ? (
            <p
              className="mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums"
              style={{
                background: netTodayPositive
                  ? "var(--glide-success-container)"
                  : "color-mix(in srgb, var(--glide-error) 12%, transparent)",
                color: netTodayPositive ? "var(--glide-success)" : "var(--glide-error)",
              }}
            >
              {netTodayPositive ? (
                <ArrowUp className="h-3 w-3" strokeWidth={2.5} aria-hidden />
              ) : (
                <ArrowDown className="h-3 w-3" strokeWidth={2.5} aria-hidden />
              )}
              {USD_FORMATTER.format(Math.abs(netToday))} today
            </p>
          ) : null}
        </section>

        {/* QUICK ACTIONS */}
        <nav aria-label="Quick actions" className="mt-7 grid shrink-0 grid-cols-4 gap-2">
          {QUICK_ACTIONS.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              prefetch
              className="glide-tap flex flex-col items-center gap-2 active:scale-95"
            >
              <ActionCircle icon={icon} />
              <span className="text-[12px] font-semibold text-[var(--glide-text)]">
                {label}
              </span>
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className="glide-tap flex flex-col items-center gap-2 active:scale-95"
          >
            <ActionCircle icon={MoreHorizontal} />
            <span className="text-[12px] font-semibold text-[var(--glide-text)]">
              More
            </span>
          </button>
        </nav>

        {/* SAVINGS — auto-grown, with quick withdraw (hidden until it exists) */}
        <SavingsCard className="mt-7" onChange={() => void refresh()} />

        {/* ASSETS */}
        <div className="mt-7 shrink-0">
          <TokenBalances tokens={tokens} loading={loading} />
        </div>

        {/* TRANSACTIONS */}
        <section className="mt-7 shrink-0 pb-4">
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-[17px] font-bold tracking-tight text-[var(--glide-text)]">
              Transactions
            </h2>
            <Link
              href="/activity"
              prefetch
              className="glide-tap text-[13px] font-semibold"
              style={{ color: "var(--glide-accent)" }}
            >
              See all
            </Link>
          </div>
          <TransactionList
            transactions={recentTransactions}
            loading={transactionsLoading}
            emptyMessage="Your activity will show up here"
          />
        </section>
      </div>

      {moreOpen ? <MoreActionsSheet onClose={closeMore} /> : null}
    </>
  );
}

function ActionCircle({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span
      className="flex h-14 w-14 items-center justify-center rounded-full"
      style={{
        background: "var(--glide-surface-container-high)",
        color: "var(--glide-text)",
      }}
    >
      <Icon className="h-[22px] w-[22px]" strokeWidth={2.25} aria-hidden />
    </span>
  );
}
