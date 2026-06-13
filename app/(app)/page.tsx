"use client";

import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { TransactionList } from "@/components/transaction-list";
import { UserAvatar } from "@/components/user-avatar";
import { usePrivacy } from "@/context/privacy-context";
import { useProfile, useWallet } from "@/context/wallet-context";
import { tokenAmountFromBalances } from "@/lib/tokens";
import type { TransactionKind } from "@/lib/types";
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
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
    refreshing,
    transactions,
    transactionsLoading,
    error,
    clearError,
    refresh,
  } = useWallet();
  const { profile } = useProfile();
  const { hideBalance } = usePrivacy();
  const [filter, setFilter] = useState<Filter>("all");

  const usdcAmount = useMemo(() => tokenAmountFromBalances(tokens ?? [], "USDC"), [tokens]);
  const eurcAmount = useMemo(() => tokenAmountFromBalances(tokens ?? [], "EURC"), [tokens]);

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
  const usdcDisplay = (Number.isFinite(usdcAmount) ? usdcAmount : 0).toFixed(2);
  const eurcDisplay = (Number.isFinite(eurcAmount) ? eurcAmount : 0).toFixed(2);

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

        {/* HERO BALANCE CARD — bright vibrant green, focal point of the screen.
            CRITICAL: `flex flex-col gap-4` guarantees vertical stacking of children
            with consistent spacing. Do NOT use `mt-*` between siblings here — gap
            handles spacing. Previous bug: stray utilities collapsed the rows so
            the balance number rendered but was clipped/overlapped. */}
        <section
          className="glow-green relative mt-4 flex flex-col gap-4 overflow-hidden rounded-3xl p-6 shadow-[0_30px_80px_-30px_rgba(74,222,128,0.5)]"
          style={{
            background:
              "linear-gradient(135deg, #4ADE80 0%, #22C55E 50%, #16A34A 100%)",
          }}
        >
          {/* radial highlight in top-left for depth */}
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background:
                "radial-gradient(circle at 20% 0%, rgba(255,255,255,0.25), transparent 50%)",
            }}
            aria-hidden
          />

          {/* Row 1: label + refresh */}
          <div className="relative flex items-start justify-between">
            <p className="text-[11px] font-bold tracking-[0.18em] text-white/80 uppercase">
              Total Balance
            </p>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={refreshing}
              aria-label="Refresh balances"
              className="glide-tap rounded-full bg-black/20 p-2 text-white transition-colors hover:bg-black/30 disabled:opacity-40"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                strokeWidth={2.25}
              />
            </button>
          </div>

          {/* Row 2: balance number — rendered UNCONDITIONALLY. Inline
              `filter: none` defeats any inherited blur filter so the hero
              balance always reads clearly. `leading-none` + min-height
              guarantee the row has visible height even before hydration. */}
          <p
            className="relative min-h-[3rem] font-display text-5xl font-bold leading-none text-white tabular-nums"
            style={{ filter: "none" }}
          >
            {hideBalance ? "••••••" : formattedTotalUsd}
          </p>

          {/* Row 3: token pills — rendered UNCONDITIONALLY. */}
          <div className="relative grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-[#0A0A0A] p-3.5">
              <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.14em] text-white/55 uppercase">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#4ADE80]/15">
                  <span className="h-2 w-2 rounded-full bg-[#4ADE80]" />
                </span>
                USDC
              </div>
              <p
                className="mt-1.5 font-display text-lg font-bold text-white tabular-nums"
                style={{ filter: "none" }}
              >
                {hideBalance ? "••••" : `$${usdcDisplay}`}
              </p>
            </div>
            <div className="rounded-2xl bg-[#0A0A0A] p-3.5">
              <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.14em] text-white/55 uppercase">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#3B82F6]/15">
                  <span className="h-2 w-2 rounded-full bg-[#3B82F6]" />
                </span>
                EURC
              </div>
              <p
                className="mt-1.5 font-display text-lg font-bold text-white tabular-nums"
                style={{ filter: "none" }}
              >
                {hideBalance ? "••••" : `€${eurcDisplay}`}
              </p>
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
                  border: "1px solid rgba(74, 222, 128, 0.22)",
                  color: "var(--glide-on-surface-elevated)",
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
                    isActive ? "glow-green" : ""
                  }`}
                  style={
                    isActive
                      ? {
                          background: "#4ADE80",
                          color: "#0A0A0A",
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

