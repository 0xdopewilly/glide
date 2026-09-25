"use client";

import { MoreActionsSheet } from "@/components/more-actions-sheet";
import { NotificationBell } from "@/components/notification-bell";
import { SavingsCard } from "@/components/savings-card";
import { TokenBalances } from "@/components/token-balances";
import { TransactionList } from "@/components/transaction-list";
import { UserAvatar } from "@/components/user-avatar";
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
  Search,
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
      {/* Revolut-style header: avatar → Settings, search, alerts. */}
      <header className="relative z-10 flex shrink-0 items-center gap-3 px-5 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <UserAvatar size="sm" linked />
        <Link
          href="/search"
          prefetch
          className="glide-tap flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full px-4 text-[15px] font-medium"
          style={{
            background: "color-mix(in srgb, var(--glide-surface-container-high) 78%, transparent)",
            color: "var(--glide-on-surface-variant)",
          }}
        >
          <Search className="h-[18px] w-[18px] shrink-0" strokeWidth={2.25} aria-hidden />
          <span className="truncate">Search</span>
        </Link>
        <NotificationBell />
      </header>

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
        <section className="mt-10 flex shrink-0 flex-col items-center text-center">
          <button
            type="button"
            onClick={() => setHideBalance(!hideBalance)}
            aria-label={hideBalance ? "Show balance" : "Hide balance"}
            aria-pressed={hideBalance}
            className="glide-tap inline-flex items-center gap-1.5 text-[14px] font-medium text-[color:var(--glide-on-surface-variant)]"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: "var(--glide-success)" }}
              aria-hidden
            />
            Main · USD
            {hideBalance ? (
              <EyeOff className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            ) : (
              <Eye className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            )}
          </button>

          <p
            className="font-display mt-3 text-[52px] font-bold leading-none tracking-[-0.03em] text-[color:var(--glide-on-surface)] tabular-nums"
            style={{ minHeight: "3.25rem" }}
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
        <nav aria-label="Quick actions" className="mt-10 grid shrink-0 grid-cols-4 gap-2">
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

        {/* TRANSACTIONS — card with See all inside, Revolut style */}
        <section className="mt-8 shrink-0" aria-label="Transactions">
          <TransactionList
            transactions={recentTransactions}
            loading={transactionsLoading}
            emptyMessage="Your activity will show up here"
            footer={
              <Link
                href="/activity"
                prefetch
                className="glide-tap block px-4 pb-4 pt-2 text-center text-[15px] font-semibold text-[var(--glide-text)]"
              >
                See all
              </Link>
            }
          />
        </section>

        {/* SAVINGS — auto-grown, with quick withdraw (hidden until it exists) */}
        <SavingsCard className="mt-6" onChange={() => void refresh()} />

        {/* ASSETS */}
        <div className="mt-6 shrink-0 pb-4">
          <TokenBalances tokens={tokens} loading={loading} />
        </div>
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
