"use client";

import { TokenIcon } from "@/components/token-icon";
import { usePrivacy } from "@/context/privacy-context";
import { formatUsd } from "@/lib/format";
import { getTokenDisplayName } from "@/lib/token-meta";
import type { GlideTokenBalance } from "@/lib/types";

const STABLE = new Set(["USDC", "EURC"]);

function formatTokenAmount(amount: number, symbol: string) {
  const s = symbol.trim().toUpperCase();
  const stable = STABLE.has(s);
  const max = stable ? 2 : s === "CIRBTC" ? 8 : 6;
  if (amount > 0 && amount < 10 ** -max) return `<${(10 ** -max).toFixed(max)}`;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: stable ? 2 : 0,
    maximumFractionDigits: max,
  }).format(amount);
}

export function TokenBalances({
  tokens,
  loading,
}: {
  tokens: GlideTokenBalance[];
  loading?: boolean;
}) {
  const { hideBalance } = usePrivacy();

  return (
    <section aria-label="Assets">
      <h2 className="mb-2 px-1 text-[17px] font-bold tracking-tight text-[var(--glide-text)]">
        Assets
      </h2>
      <div className="glide-surface-card overflow-hidden rounded-2xl py-1">
        {loading && tokens.length === 0
          ? [0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3" aria-hidden>
                <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-[color:var(--glide-surface-container)]" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3 w-24 animate-pulse rounded bg-[color:var(--glide-surface-container)]" />
                  <div className="h-2.5 w-16 animate-pulse rounded bg-[color:var(--glide-surface-container)]" />
                </div>
                <div className="h-3 w-14 animate-pulse rounded bg-[color:var(--glide-surface-container)]" />
              </div>
            ))
          : tokens.map((token) => (
              <div
                key={`${token.symbol}-${token.chainId}`}
                className="flex items-center gap-3 px-4 py-3"
              >
                <TokenIcon symbol={token.symbol} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold tracking-tight text-[var(--glide-text)]">
                    {getTokenDisplayName(token.symbol)}
                  </p>
                  <p className="mt-0.5 truncate text-[12.5px] tabular-nums text-[var(--glide-muted)]">
                    {hideBalance
                      ? `•••• ${token.symbol}`
                      : `${formatTokenAmount(token.amount, token.symbol)} ${token.symbol}`}
                  </p>
                </div>
                <p className="shrink-0 text-[15px] font-semibold tabular-nums text-[var(--glide-text)]">
                  {hideBalance ? "••••" : `$${formatUsd(token.usdValue)}`}
                </p>
              </div>
            ))}
      </div>
    </section>
  );
}
