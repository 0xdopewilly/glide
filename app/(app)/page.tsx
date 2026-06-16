"use client";

import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { TokenBalances } from "@/components/token-balances";
import { TransactionList } from "@/components/transaction-list";
import { UserAvatar } from "@/components/user-avatar";
import { usePrivacy } from "@/context/privacy-context";
import { useProfile, useWallet } from "@/context/wallet-context";
import type { TransactionKind } from "@/lib/types";
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  Eye,
  EyeOff,
  Plus,
  QrCode,
  RefreshCw,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

type Filter = "all" | "send" | "receive" | "swap" | "bridge";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "send", label: "Sent" },
  { id: "receive", label: "Received" },
  { id: "swap", label: "Swap" },
  { id: "bridge", label: "Bridge" },
];

const QUICK_ACTIONS = [
  { href: "/send", label: "Send", icon: ArrowUp },
  { href: "/receive", label: "Receive", icon: ArrowDown },
  { href: "/swap", label: "Swap", icon: ArrowLeftRight },
  { href: "/bridge", label: "Bridge", icon: Workflow },
] as const;

function greetingFor(date: Date) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
  const {
    totalUsd,
    tokens,
    loading,
    refreshing,
    transactions,
    transactionsLoading,
    error,
    clearError,
    refresh,
  } = useWallet();
  const { profile } = useProfile();
  const { hideBalance, setHideBalance } = usePrivacy();
  const [filter, setFilter] = useState<Filter>("all");

  // TODO: replace with a real 24h portfolio change calc from wallet-context.
  // Hardcoded placeholder for now so the UI has the green pill.
  const portfolioChange = 2.48;
  const portfolioChangePositive = portfolioChange >= 0;

  const greeting = useMemo(() => greetingFor(new Date()), []);
  const firstName = (profile.displayName ?? "").trim().split(" ")[0] || "there";

  const filteredTransactions = useMemo(() => {
    if (filter === "all") return transactions;
    return transactions.filter((tx) => tx.kind === (filter as TransactionKind));
  }, [filter, transactions]);

  const visibleTransactions = filteredTransactions.slice(0, 6);

  // Pre-format BEFORE JSX so the number always renders even when totalUsd is
  // 0 or undefined (fixes invisible-balance bug where number went missing).
  const formattedTotalUsd = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(
    typeof totalUsd === "number" && Number.isFinite(totalUsd) ? totalUsd : 0,
  );

  return (
    <>
      <header className="relative z-10 flex shrink-0 items-center justify-between gap-3 px-5 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <UserAvatar size="sm" linked />
          <div className="min-w-0 flex-1">
            <p className="glide-label-mono text-[10px] font-semibold text-[var(--glide-muted)]">
              {greeting}
            </p>
            <p className="truncate text-[15px] font-bold tracking-tight text-[var(--glide-text)]">
              Hi, {firstName}
            </p>
          </div>
        </div>
        <div
          className="glide-m3-toolbar flex shrink-0 items-center gap-0.5 p-0.5"
          role="toolbar"
          aria-label="Account actions"
        >
          <NotificationBell />
          <ThemeToggle />
        </div>
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

        {/* HERO PORTFOLIO CARD — "Total Portfolio" design.
            Left: privacy-toggleable portfolio total + 24h change pill.
            Right: stacked 64x64 square buttons (Add Funds, Scan, Refresh).
            Sound-wave decoration in the lower area for depth.

            LAYOUT GUARANTEES (do not change without testing):
            - Section has explicit minHeight so it cannot collapse.
            - Inner layout uses CSS GRID (1fr auto), not nested flex,
              so the right column's width is auto-computed from its
              fixed-width children and never squashes the left side.
            - Each button is explicit 64x64 inline. */}
        <section
          className="relative mt-4 overflow-hidden rounded-3xl border p-5 sm:p-6"
          style={{
            background: "var(--glide-surface-container)",
            borderColor: "var(--glide-elevated-border)",
            minHeight: "220px",
            flexShrink: 0,
          }}
        >
          {/* Sound-wave / equalizer decoration — bottom-left of card,
              behind content, fixed-size so it never grows to fill. */}
          <svg
            aria-hidden
            viewBox="0 0 200 60"
            preserveAspectRatio="none"
            fill="none"
            style={{
              position: "absolute",
              bottom: 16,
              left: 20,
              width: 180,
              height: 50,
              opacity: 0.35,
              pointerEvents: "none",
              zIndex: 0,
            }}
          >
            {[
              30, 45, 60, 75, 85, 90, 85, 70, 55, 40, 30, 25, 40, 55, 70, 80,
              85, 80, 70, 55, 40, 30, 25, 20,
            ].map((h, i) => (
              <rect
                key={i}
                x={i * 8 + 2}
                y={30 - h * 0.25}
                width={3}
                height={h * 0.5}
                rx={1.5}
                className="fill-[color:var(--glide-primary)]"
                opacity={0.3 + h / 200}
              />
            ))}
          </svg>

          <div
            className="relative grid gap-4"
            style={{
              gridTemplateColumns: "1fr auto",
              zIndex: 1,
            }}
          >
            {/* LEFT: label, balance, change chip */}
            <div className="flex min-w-0 flex-col gap-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-[color:var(--glide-on-surface-variant)]">
                  Total Portfolio
                </p>
                <button
                  type="button"
                  onClick={() => setHideBalance(!hideBalance)}
                  aria-label={hideBalance ? "Show balance" : "Hide balance"}
                  aria-pressed={hideBalance}
                  className="glide-tap text-[color:var(--glide-on-surface-variant)] transition-colors hover:text-[color:var(--glide-on-surface)]"
                >
                  {hideBalance ? (
                    <EyeOff className="h-4 w-4" strokeWidth={2.25} />
                  ) : (
                    <Eye className="h-4 w-4" strokeWidth={2.25} />
                  )}
                </button>
              </div>

              <p
                className="font-display text-4xl font-bold leading-none text-[color:var(--glide-on-surface)] tabular-nums sm:text-5xl"
                style={{ minHeight: "3rem" }}
              >
                {hideBalance ? "••••" : formattedTotalUsd}
              </p>

              <div
                className="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1"
                style={{
                  background: portfolioChangePositive
                    ? "rgba(16, 185, 129, 0.12)"
                    : "rgba(239, 68, 68, 0.12)",
                }}
              >
                {portfolioChangePositive ? (
                  <ArrowUp
                    className="h-3 w-3 text-[#10B981]"
                    strokeWidth={2.5}
                  />
                ) : (
                  <ArrowDown
                    className="h-3 w-3 text-[#EF4444]"
                    strokeWidth={2.5}
                  />
                )}
                <span
                  className="text-xs font-semibold tabular-nums"
                  style={{
                    color: portfolioChangePositive ? "#10B981" : "#EF4444",
                  }}
                >
                  {Math.abs(portfolioChange).toFixed(2)}% today
                </span>
              </div>
            </div>

            {/* RIGHT: 3 stacked 64x64 buttons (explicit width column) */}
            <div
              className="flex flex-col gap-2"
              style={{ width: "64px" }}
            >
              <Link
                href="/receive"
                prefetch
                className="glide-tap group flex flex-col items-center justify-center rounded-2xl border transition-colors"
                style={{
                  width: "64px",
                  height: "64px",
                  background: "var(--glide-surface-elevated)",
                  borderColor: "var(--glide-elevated-border)",
                }}
              >
                <Plus
                  className="h-5 w-5 text-[color:var(--glide-primary)]"
                  strokeWidth={2.25}
                />
                <span className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-[color:var(--glide-on-elevated-variant)]">
                  Add Funds
                </span>
              </Link>
              <Link
                href="/scan"
                prefetch
                className="glide-tap group flex flex-col items-center justify-center rounded-2xl border transition-colors"
                style={{
                  width: "64px",
                  height: "64px",
                  background: "var(--glide-surface-elevated)",
                  borderColor: "var(--glide-elevated-border)",
                }}
              >
                <QrCode
                  className="h-5 w-5 text-[color:var(--glide-primary)]"
                  strokeWidth={2.25}
                />
                <span className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-[color:var(--glide-on-elevated-variant)]">
                  Scan
                </span>
              </Link>
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={refreshing}
                aria-label="Refresh balances"
                className="glide-tap group flex flex-col items-center justify-center rounded-2xl border transition-colors disabled:opacity-50"
                style={{
                  width: "64px",
                  height: "64px",
                  background: "var(--glide-surface-elevated)",
                  borderColor: "var(--glide-elevated-border)",
                }}
              >
                <RefreshCw
                  className={`h-5 w-5 text-[color:var(--glide-primary)] ${
                    refreshing ? "animate-spin" : ""
                  }`}
                  strokeWidth={2.25}
                />
                <span className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-[color:var(--glide-on-elevated-variant)]">
                  Refresh
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* QUICK ACTIONS */}
        <nav
          aria-label="Quick actions"
          className="mt-6 grid grid-cols-4 gap-2"
        >
          {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              prefetch
              className="glide-tap group flex flex-col items-center gap-2"
            >
              <span
                className="flex h-14 w-14 items-center justify-center rounded-full transition-colors"
                style={{
                  background: "var(--glide-surface-elevated)",
                  border: "1px solid var(--glide-elevated-border)",
                  color: "var(--glide-on-elevated)",
                }}
              >
                <Icon className="h-5 w-5" strokeWidth={2.25} />
              </span>
              <span className="text-[11px] font-semibold text-[var(--glide-text)]">
                {label}
              </span>
            </Link>
          ))}
        </nav>

        {/* ASSETS — token balances list (USDC / EURC / cirBTC) */}
        <div className="mt-8">
          <TokenBalances tokens={tokens} loading={loading} />
        </div>

        {/* TRANSACTIONS */}
        <section className="mt-8 flex-1 pb-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[17px] font-bold tracking-tight text-[var(--glide-text)]">
              Transactions
            </h2>
            <Link
              href="/activity"
              prefetch
              className="glide-tap text-[13px] font-semibold transition-opacity hover:opacity-80"
              style={{ color: "var(--glide-accent)" }}
            >
              See all
            </Link>
          </div>

          <div
            className="-mx-5 mb-3 flex gap-2 overflow-x-auto px-5 pb-1"
            style={{ scrollbarWidth: "none" }}
          >
            {FILTERS.map((f) => {
              const isActive = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`glide-tap shrink-0 rounded-full px-4 py-1.5 text-[12px] font-semibold transition-colors ${
                    isActive ? "glow-brand" : ""
                  }`}
                  style={
                    isActive
                      ? {
                          background: "var(--glide-primary)",
                          color: "var(--glide-on-primary)",
                          border: "1px solid transparent",
                        }
                      : {
                          background: "transparent",
                          color: "var(--glide-text)",
                          border:
                            "1px solid color-mix(in srgb, var(--glide-text) 14%, transparent)",
                        }
                  }
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          <TransactionList
            transactions={visibleTransactions}
            loading={transactionsLoading}
            emptyMessage={
              filter === "all"
                ? "Your activity will show up here"
                : "No matching transactions"
            }
          />
        </section>
      </div>
    </>
  );
}

