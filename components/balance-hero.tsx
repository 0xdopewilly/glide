"use client";

import { usePrivacy } from "@/context/privacy-context";
import { formatUsd } from "@/lib/format";
import { motion, useScroll, useTransform } from "framer-motion";
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
  const { hideBalance, setHideBalance } = usePrivacy();
  const realText = `$${formatUsd(displayTotal)}`;

  // Recede effect: hero shrinks + fades a touch as the user scrolls past it.
  // Only transform + opacity — keeps the GPU happy on mobile.
  const { scrollY } = useScroll();
  const scale = useTransform(scrollY, [0, 220], [1, 0.86], { clamp: true });
  const opacity = useTransform(scrollY, [0, 220], [1, 0.55], { clamp: true });
  const y = useTransform(scrollY, [0, 220], [0, -12], { clamp: true });

  return (
    <section className="flex flex-col items-start px-0 pb-2 pt-4 text-left">
      <div className="flex w-full items-center justify-between gap-2">
        <span className="glide-label-mono text-[11px] font-semibold text-[var(--glide-muted)]">
          Balance
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
      <motion.button
        type="button"
        onClick={() => setHideBalance(!hideBalance)}
        aria-label={hideBalance ? "Show balance" : "Hide balance"}
        className="glide-tap mt-2 inline-block origin-left text-left"
        style={{ scale, opacity, y }}
      >
        <h1
          className={`glide-scale-in font-bold leading-[1.05] text-[var(--glide-text)] tabular-nums ${
            hideBalance
              ? "text-[2.5rem] tracking-[0.18em]"
              : "text-[3.5rem] tracking-[-0.04em] sm:text-[3.75rem]"
          } ${loading ? "opacity-50" : ""}`}
        >
          {hideBalance ? "······" : realText}
        </h1>
      </motion.button>
    </section>
  );
}
