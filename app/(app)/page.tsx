"use client";

import { ActionGrid } from "@/components/action-grid";
import { AppHeader } from "@/components/app-header";
import { BalanceHero } from "@/components/balance-hero";
import { TokenBalances } from "@/components/token-balances";
import { TransactionList } from "@/components/transaction-list";
import { useWallet } from "@/context/wallet-context";
import { totalUsdFromTokens } from "@/lib/tokens";
import Link from "next/link";
import { useMemo } from "react";

export default function HomePage() {
  const {
    balance,
    tokens,
    loading,
    refreshing,
    transactions,
    transactionsLoading,
    error,
    clearError,
    refresh,
  } = useWallet();

  const totalUsd = useMemo(() => totalUsdFromTokens(tokens), [tokens]);

  return (
    <>
      <AppHeader showLogo />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6">
        {error ? (
          <div className="mt-3 rounded-2xl bg-red-500/10 px-3 py-2 text-sm font-medium text-red-700 dark:text-red-300">
            <span className="truncate">{error}</span>
            <button type="button" onClick={clearError} className="ml-2 underline">
              Dismiss
            </button>
          </div>
        ) : null}
        <BalanceHero
          balance={balance}
          totalUsd={totalUsd}
          loading={loading}
          refreshing={refreshing}
          onRefresh={() => void refresh()}
        />
        <ActionGrid />
        <TokenBalances tokens={tokens} />

        <section className="mt-10 flex-1 pb-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-neutral-500 dark:text-white/50">
              Recent
            </h2>
            <Link
              href="/activity"
              className="text-sm font-semibold text-neutral-950 transition-colors hover:opacity-70 dark:text-white"
            >
              See all
            </Link>
          </div>
          <TransactionList
            transactions={transactions.slice(0, 3)}
            loading={transactionsLoading}
            emptyMessage="Your activity will show up here"
          />
        </section>
      </div>
    </>
  );
}
