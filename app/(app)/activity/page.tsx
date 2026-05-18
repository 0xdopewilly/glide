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
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-6">
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium tracking-tight shadow-sm"
            style={{
              background: "var(--glide-surface-elevated)",
              borderColor: "var(--glide-border)",
              color: "var(--glide-text)",
            }}
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
