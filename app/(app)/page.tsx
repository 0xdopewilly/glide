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
  Eye,
  EyeOff,
  LayoutGrid,
  ScanLine,
  Sparkles,
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

  const firstName = (profile.displayName ?? "").trim().split(" ")[0] || "there";
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
            Hey {firstName}!
          </p>
          <p className="truncate text-[20px] font-bold tracking-tight text-[color:var(--glide-on-surface)]">
            Welcome back!
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
          {/* SMART ASSISTANT — Billy */}
          <Link
            href="/ask"
            prefetch
            className="glide-tap glide-surface-card flex shrink-0 items-center gap-3 overflow-hidden rounded-3xl p-4"
            style={{ boxShadow: "0 18px 40px -22px rgba(40, 20, 120, 0.55)" }}
          >
            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-bold tracking-tight text-[var(--glide-text)]">
                Smart Assistant
              </p>
              <p className="mt-0.5 text-[13px] text-[var(--glide-muted)]">
                Money made simple with Billy
              </p>
              <span
                className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold"
                style={{ background: "var(--glide-primary)", color: "var(--glide-on-primary)" }}
              >
                <Sparkles className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                Help with Billy
              </span>
            </div>
            <BillyArt />
          </Link>

          {/* ASSETS */}
          <div className="mt-6 shrink-0">
            <TokenBalances tokens={tokens} loading={loading} />
          </div>

          {/* SAVINGS — auto-grown, with quick withdraw (hidden until it exists) */}
          <SavingsCard className="mt-6" onChange={() => void refresh()} />

          {/* LAST TRANSACTIONS — each its own card */}
          <section className="mt-6 shrink-0" aria-label="Transactions">
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 className="text-[17px] font-bold tracking-tight text-[var(--glide-text)]">
                Last Transactions
              </h2>
              <Link
                href="/activity"
                prefetch
                className="glide-tap text-[14px] font-medium text-[var(--glide-muted)]"
              >
                Show all
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

/** Billy, a friendly little assistant bot (inline SVG, no image request). */
function BillyArt() {
  return (
    <svg viewBox="0 0 96 96" className="h-[86px] w-[86px] shrink-0" aria-hidden>
      <defs>
        <linearGradient id="billy-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F4F1FF" />
          <stop offset="1" stopColor="#D9D0FF" />
        </linearGradient>
        <linearGradient id="billy-face" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3B2A9C" />
          <stop offset="1" stopColor="#1E1650" />
        </linearGradient>
      </defs>
      <circle cx="48" cy="52" r="40" fill="#EEE9FF" />
      <line x1="48" y1="14" x2="48" y2="24" stroke="#8B6CF6" strokeWidth="3" strokeLinecap="round" />
      <circle cx="48" cy="12" r="4.5" fill="#8B6CF6" />
      <rect x="20" y="24" width="56" height="44" rx="20" fill="url(#billy-body)" stroke="#C9BDFF" />
      <rect x="27" y="32" width="42" height="26" rx="13" fill="url(#billy-face)" />
      <circle cx="39" cy="45" r="4" fill="#7FE7FF" />
      <circle cx="57" cy="45" r="4" fill="#7FE7FF" />
      <path d="M42 52 Q48 56 54 52" stroke="#7FE7FF" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <rect x="14" y="40" width="7" height="14" rx="3.5" fill="#B7A8FF" />
      <rect x="75" y="40" width="7" height="14" rx="3.5" fill="#B7A8FF" />
      <rect x="34" y="70" width="28" height="12" rx="6" fill="url(#billy-body)" stroke="#C9BDFF" />
    </svg>
  );
}
