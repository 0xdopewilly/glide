"use client";

import { PageHeader } from "@/components/page-header";
import { TransactionList } from "@/components/transaction-list";
import { useWallet } from "@/context/wallet-context";
import { RefreshCw } from "lucide-react";

export default function ActivityPage() {
  const { transactions, refresh, loading } = useWallet();

  return (
    <>
      <PageHeader title="Activity" />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-6">
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-4 py-2 text-xs font-semibold tracking-tight text-neutral-700 transition-opacity hover:opacity-80 disabled:opacity-50 dark:bg-[#1c1c1e] dark:text-white/75"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
        <TransactionList transactions={transactions} />
      </div>
    </>
  );
}
