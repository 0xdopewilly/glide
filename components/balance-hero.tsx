"use client";

import { ChainIcon } from "@/components/chain-icon";
import { usePrivacy } from "@/context/privacy-context";
import { formatUsd } from "@/lib/format";
import { RefreshCw } from "lucide-react";

export function BalanceHero({
  balance,
  totalUsd,
  onRefresh,
  loading,
  refreshing,
}: {
  balance: number;
  totalUsd?: number;
  onRefresh: () => void;
  loading?: boolean;
  refreshing?: boolean;
}) {
  const displayTotal = totalUsd ?? balance;
  const { hideBalance } = usePrivacy();

  return (
    <section className="flex flex-col items-start px-0 pb-2 pt-4 text-left">
      <div className="flex w-full items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--glide-surface-container)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--glide-muted)]">
          <ChainIcon chainId="arc-testnet" size="sm" />
          Arc testnet
        </span>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading || refreshing}
          aria-label="Refresh balances"
          className="glide-m3-icon-btn inline-flex h-9 w-9 items-center justify-center disabled:opacity-40"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            strokeWidth={2}
          />
        </button>
      </div>
      <h1
        className={`mt-4 text-[3.25rem] font-bold leading-[1.05] tracking-[-0.035em] text-[var(--glide-text)] sm:text-[3.5rem] ${
          loading ? "opacity-50" : ""
        } ${hideBalance ? "select-none blur-md" : ""}`}
        aria-hidden={hideBalance}
      >
        {hideBalance ? "••••" : `$${formatUsd(displayTotal)}`}
      </h1>
      <p className="glide-muted mt-2 text-[15px] leading-relaxed">
        Your balance on Glide
      </p>
    </section>
  );
}
