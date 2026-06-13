"use client";

import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { TransactionList } from "@/components/transaction-list";
import { UserAvatar } from "@/components/user-avatar";
import { usePrivacy } from "@/context/privacy-context";
import { useProfile, useWallet } from "@/context/wallet-context";
import { formatUsd } from "@/lib/format";
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
  const { hideBalance, blurAmounts } = usePrivacy();
  const [filter, setFilter] = useState<Filter>("all");

  const usdcAmount = useMemo(() => tokenAmountFromBalances(tokens, "USDC"), [tokens]);
  const eurcAmount = useMemo(() => tokenAmountFromBalances(tokens, "EURC"), [tokens]);
  const cirBtcAmount = useMemo(
    () => tokenAmountFromBalances(tokens, "cirBTC"),
    [tokens],
  );

  const greeting = useMemo(() => greetingFor(new Date()), []);
  const firstName = (profile.displayName ?? "").trim().split(" ")[0] || "there";

  const filteredTransactions = useMemo(() => {
    if (filter === "all") return transactions;
    return transactions.filter((tx) => tx.kind === (filter as TransactionKind));
  }, [filter, transactions]);

  const visibleTransactions = filteredTransactions.slice(0, 6);

  const heroValueText = `$${formatUsd(totalUsd ?? 0)}`;

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

        {/* HERO BALANCE CARD */}
        <section
          className="glow-green relative mt-4 overflow-hidden rounded-3xl p-6"
          style={{
            background:
              "radial-gradient(120% 80% at 0% 0%, rgba(74, 222, 128, 0.22) 0%, transparent 55%), linear-gradient(155deg, #0F2E1C 0%, #0A0A0A 70%)",
            color: "#FFFFFF",
          }}
        >
          <div className="flex items-center justify-between">
            <span
              className="glide-label-mono text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "#A1A1AA" }}
            >
              Total balance
            </span>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={refreshing}
              aria-label="Refresh balances"
              className="glide-tap inline-flex h-8 w-8 items-center justify-center rounded-full disabled:opacity-40"
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(74, 222, 128, 0.22)",
                color: "#FFFFFF",
              }}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
                strokeWidth={2.25}
              />
            </button>
          </div>

          <h1
            className={`mt-3 font-bold leading-[1.02] tabular-nums ${
              hideBalance
                ? "text-4xl tracking-[0.18em]"
                : "text-[2.75rem] tracking-[-0.04em] sm:text-5xl"
            }`}
            style={{ color: "#FFFFFF" }}
          >
            {hideBalance ? "······" : heroValueText}
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <TokenPill
              symbol="USDC"
              amount={usdcAmount}
              active
              blur={blurAmounts}
            />
            <TokenPill
              symbol="EURC"
              amount={eurcAmount}
              blur={blurAmounts}
            />
            {cirBtcAmount > 0 ? (
              <TokenPill
                symbol="cirBTC"
                amount={cirBtcAmount}
                blur={blurAmounts}
                decimals={6}
              />
            ) : null}
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

function TokenPill({
  symbol,
  amount,
  active = false,
  blur = false,
  decimals = 2,
}: {
  symbol: string;
  amount: number;
  active?: boolean;
  blur?: boolean;
  decimals?: number;
}) {
  const formatted = blur
    ? "•••"
    : amount.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

  const dotColor = active ? "#0A0A0A" : "#4ADE80";

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5"
      style={
        active
          ? { background: "#4ADE80", color: "#0A0A0A" }
          : {
              background: "rgba(255, 255, 255, 0.06)",
              color: "#FFFFFF",
              border: "1px solid rgba(255, 255, 255, 0.12)",
            }
      }
    >
      <span
        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: dotColor }}
        aria-hidden
      />
      <span className="flex flex-col leading-tight">
        <span
          className="glide-label-mono text-[9px] font-bold uppercase tracking-wider"
          style={{ opacity: active ? 0.72 : 0.7 }}
        >
          {symbol}
        </span>
        <span className="text-[12px] font-bold tabular-nums">{formatted}</span>
      </span>
    </span>
  );
}
