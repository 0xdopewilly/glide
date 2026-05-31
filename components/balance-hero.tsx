"use client";

import { usePrivacy } from "@/context/privacy-context";
import { formatUsd } from "@/lib/format";
import { RefreshCw } from "lucide-react";
import { useEffect, useRef } from "react";

const MAX_SCROLL = 220;

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

  // Recede effect: hero shrinks + fades as the user scrolls past it. Hand-
  // rolled with a passive scroll listener + rAF throttle so we don't ship
  // 130 KB of framer-motion to the home page bundle just for this one
  // transform. Only modifies `transform` + `opacity` — GPU-cheap on mobile.
  const heroRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    let rafId = 0;
    let lastY = -1;
    const apply = () => {
      rafId = 0;
      const y = Math.min(window.scrollY, MAX_SCROLL);
      if (y === lastY) return;
      lastY = y;
      const node = heroRef.current;
      if (!node) return;
      const t = y / MAX_SCROLL;
      const scale = 1 - t * 0.14;
      const opacity = 1 - t * 0.45;
      const translate = -12 * t;
      node.style.transform = `translate3d(0, ${translate}px, 0) scale(${scale})`;
      node.style.opacity = String(opacity);
    };
    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

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
      <button
        ref={heroRef}
        type="button"
        onClick={() => setHideBalance(!hideBalance)}
        aria-label={hideBalance ? "Show balance" : "Hide balance"}
        className="glide-tap mt-2 inline-block origin-left text-left will-change-transform"
        style={{ transformOrigin: "left center" }}
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
      </button>
    </section>
  );
}
