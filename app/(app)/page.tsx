"use client";

import { AccountsSheet } from "@/components/accounts-sheet";
import { headerIconButtonClassName } from "@/components/header-icon-button";
import { MoreActionsSheet } from "@/components/more-actions-sheet";
import { NotificationBell } from "@/components/notification-bell";
import { SavingsCard } from "@/components/savings-card";
import { TokenBalances } from "@/components/token-balances";
import { TransactionList } from "@/components/transaction-list";
import { usePrivacy } from "@/context/privacy-context";
import { useProfile, useWallet } from "@/context/wallet-context";
import {
  ArrowLeftRight,
  ChevronRight,
  Eye,
  EyeOff,
  LayoutGrid,
  MessageCircle,
  ScanLine,
  SquareArrowDown,
  SquareArrowOutUpRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";

// Hoisted: Intl.NumberFormat construction is the expensive part. Reused
// across renders instead of re-allocated every time.
const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const QUICK_ACTIONS = [
  { href: "/send", label: "Send", icon: SquareArrowOutUpRight },
  { href: "/receive", label: "Receive", icon: SquareArrowDown },
  { href: "/swap", label: "Swap", icon: ArrowLeftRight },
] as const;

type Sheet = "more" | "accounts" | null;

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
  const { profile } = useProfile();
  const { hideBalance, setHideBalance } = usePrivacy();
  const [sheet, setSheet] = useState<Sheet>(null);
  const closeSheet = useCallback(() => setSheet(null), []);

  const firstName = (profile.displayName ?? "").trim().split(" ")[0];
  const recentTransactions = transactions.slice(0, 5);

  // Pre-format BEFORE JSX so the number always renders even when totalUsd is
  // 0 or undefined (fixes invisible-balance bug where number went missing).
  const formattedTotalUsd = USD_FORMATTER.format(
    typeof totalUsd === "number" && Number.isFinite(totalUsd) ? totalUsd : 0,
  );
  // "$2,420" + ".39": cents drawn lighter, as in the reference design.
  const dot = formattedTotalUsd.lastIndexOf(".");
  const whole = dot > 0 ? formattedTotalUsd.slice(0, dot) : formattedTotalUsd;
  const cents = dot > 0 ? formattedTotalUsd.slice(dot) : "";

  return (
    <>
      <header className="relative z-10 flex shrink-0 items-center justify-between gap-3 px-5 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-[color:var(--glide-on-surface-variant)]">
            Welcome back
          </p>
          <p className="truncate text-[20px] font-bold tracking-tight text-[color:var(--glide-on-surface)]">
            {firstName || "glidepay"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/send?scan=1"
            prefetch
            aria-label="Scan to pay"
            className={headerIconButtonClassName()}
          >
            <ScanLine className="h-[18px] w-[18px]" strokeWidth={2.25} />
          </Link>
          <NotificationBell />
        </div>
      </header>

      <div className="glide-scroll flex min-h-0 flex-1 flex-col overflow-y-auto px-5">
        {error ? (
          <div className="mt-3 rounded-2xl bg-red-500/10 px-3 py-2 text-sm font-medium text-red-700 dark:text-red-200">
            <span className="truncate">{error}</span>
            <button type="button" onClick={clearError} className="ml-2 underline">
              Dismiss
            </button>
          </div>
        ) : null}

        {/* BALANCE */}
        <section className="mt-7 flex shrink-0 flex-col items-center text-center">
          <button
            type="button"
            onClick={() => setHideBalance(!hideBalance)}
            aria-label={hideBalance ? "Show balance" : "Hide balance"}
            aria-pressed={hideBalance}
            className="glide-tap inline-flex items-center gap-1.5 text-[14px] font-medium text-[color:var(--glide-on-surface-variant)]"
          >
            Main · USD
            {hideBalance ? (
              <EyeOff className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            ) : (
              <Eye className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            )}
          </button>

          <p
            className="font-display mt-2 text-[48px] font-bold leading-none tracking-[-0.03em] text-[color:var(--glide-on-surface)] tabular-nums"
            style={{ minHeight: "3rem" }}
          >
            {hideBalance ? (
              "••••"
            ) : (
              <>
                {whole}
                <span style={{ color: "var(--glide-balance-cents)" }}>{cents}</span>
              </>
            )}
          </p>

          <button
            type="button"
            onClick={() => setSheet("accounts")}
            aria-haspopup="dialog"
            className="glide-tap mt-4 rounded-full px-4 py-1.5 text-[13px] font-semibold text-[color:var(--glide-on-surface)]"
            style={{
              background: "var(--glide-surface-container-high)",
              border: "1px solid var(--glide-border)",
            }}
          >
            Accounts
          </button>
        </section>

        {/* QUICK ACTIONS */}
        <nav aria-label="Quick actions" className="mt-8 grid shrink-0 grid-cols-4 gap-2">
          {QUICK_ACTIONS.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              prefetch
              className="glide-tap flex flex-col items-center gap-2 active:scale-95"
            >
              <ActionTile icon={icon} />
              <span className="text-[12px] font-semibold text-[color:var(--glide-on-surface)]">
                {label}
              </span>
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setSheet("more")}
            aria-haspopup="dialog"
            aria-expanded={sheet === "more"}
            className="glide-tap flex flex-col items-center gap-2 active:scale-95"
          >
            <ActionTile icon={LayoutGrid} />
            <span className="text-[12px] font-semibold text-[color:var(--glide-on-surface)]">
              More
            </span>
          </button>
        </nav>

        {/* LOWER HALF — the light sheet, per the reference */}
        <div className="glide-light-sheet -mx-5 mt-7 flex flex-1 flex-col px-5 pb-6">
          {/* BILLY — the in-app assistant */}
          <Link
            href="/ask"
            prefetch
            className="glide-tap glide-surface-card flex shrink-0 items-center gap-3 overflow-hidden rounded-2xl p-4"
          >
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
              style={{ background: "var(--glide-primary-container)", color: "var(--glide-accent)" }}
            >
              <MessageCircle className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold tracking-tight text-[var(--glide-text)]">
                Ask Billy
              </p>
              <p className="mt-0.5 truncate text-[13px] text-[var(--glide-muted)]">
                Send, request, split or swap by chat
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-[var(--glide-muted)]" strokeWidth={2} aria-hidden />
          </Link>

          {/* ASSETS */}
          <div className="mt-6 shrink-0">
            <TokenBalances tokens={tokens} loading={loading} />
          </div>

          {/* SAVINGS — auto-grown, with quick withdraw (hidden until it exists) */}
          <SavingsCard className="mt-6" onChange={() => void refresh()} />

          {/* RECENT ACTIVITY — each its own card */}
          <section className="mt-6 shrink-0" aria-label="Transactions">
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 className="text-[17px] font-bold tracking-tight text-[var(--glide-text)]">
                Recent activity
              </h2>
              <Link
                href="/activity"
                prefetch
                className="glide-tap text-[14px] font-medium text-[var(--glide-muted)]"
              >
                See all
              </Link>
            </div>
            <TransactionList
              transactions={recentTransactions}
              loading={transactionsLoading}
              emptyMessage="No transactions yet"
              separate
              emptyArt
            />
          </section>
        </div>
      </div>

      {sheet === "more" ? <MoreActionsSheet onClose={closeSheet} /> : null}
      {sheet === "accounts" ? (
        <AccountsSheet mainUsd={totalUsd} onClose={closeSheet} />
      ) : null}
    </>
  );
}

/** Frosted-glass circle, as in the reference. */
function ActionTile({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span
      className="flex h-[58px] w-[58px] items-center justify-center rounded-full"
      style={{
        background: "var(--glide-surface-container-high)",
        border: "1px solid var(--glide-border)",
        color: "var(--glide-on-surface)",
      }}
    >
      <Icon className="h-[22px] w-[22px]" strokeWidth={2.25} aria-hidden />
    </span>
  );
}
