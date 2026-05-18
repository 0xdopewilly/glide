"use client";

import { ActionGrid } from "@/components/action-grid";
import { AppHeader } from "@/components/app-header";
import { BalanceHero } from "@/components/balance-hero";
import { ChatBar } from "@/components/chat-bar";
import { TransactionList } from "@/components/transaction-list";
import { useWallet } from "@/context/wallet-context";
import Link from "next/link";

export default function HomePage() {
  const { balance, loading, fundWallet, transactions, error, clearError } =
    useWallet();

  return (
    <>
      <AppHeader showLogo />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5">
        {error ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            <span className="truncate">{error}</span>
            <button type="button" onClick={clearError} className="ml-2 underline">
              Dismiss
            </button>
          </div>
        ) : null}

        <BalanceHero
          balance={balance}
          loading={loading}
          onAddCash={() => void fundWallet()}
        />
        <ActionGrid />

        <section className="mt-8 flex-1 pb-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Recent</h2>
            <Link
              href="/activity"
              className="text-sm font-semibold"
              style={{ color: "var(--glide-accent)" }}
            >
              See all
            </Link>
          </div>
          <TransactionList
            transactions={transactions.slice(0, 3)}
            emptyMessage="Your activity will show up here"
          />
        </section>
      </div>
      <ChatBar />
    </>
  );
}
