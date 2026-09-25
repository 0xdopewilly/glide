"use client";

import { TokenIcon } from "@/components/token-icon";
import { usePrivacy } from "@/context/privacy-context";
import { formatUsd } from "@/lib/format";
import { getTokenDisplayName } from "@/lib/token-meta";
import type { GlideTokenBalance } from "@/lib/types";
import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const STABLE = new Set(["USDC", "EURC"]);

function formatTokenAmount(amount: number, symbol: string, decimals?: number) {
  const s = symbol.trim().toUpperCase();
  const stable = STABLE.has(s);
  const max = stable ? 2 : s === "CIRBTC" ? 8 : Math.min(decimals ?? 6, 6);
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
  const [showHidden, setShowHidden] = useState(false);

  const verified = tokens.filter((t) => t.verified !== false);
  const others = tokens.filter((t) => t.verified === false && !t.suspicious);
  const hidden = tokens.filter((t) => t.verified === false && t.suspicious);

  const amountText = (t: GlideTokenBalance) =>
    hideBalance
      ? `•••• ${t.symbol}`
      : `${formatTokenAmount(t.amount, t.symbol, t.decimals)} ${t.symbol}`;

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
          : verified.map((token) => (
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
                    {amountText(token)}
                  </p>
                </div>
                <p className="shrink-0 text-[15px] font-semibold tabular-nums text-[var(--glide-text)]">
                  {hideBalance
                    ? "••••"
                    : token.priced === false && token.amount > 0
                      ? "—"
                      : `$${formatUsd(token.usdValue)}`}
                </p>
              </div>
            ))}

        {others.map((token) => (
          <Link
            key={token.tokenAddress}
            href={`/send?token=${token.tokenAddress}`}
            prefetch={false}
            className="glide-tap flex items-center gap-3 px-4 py-3"
            aria-label={`Send ${token.symbol}`}
          >
            <TokenIcon symbol={token.symbol} size={40} unverified />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold tracking-tight text-[var(--glide-text)]">
                {token.name || token.symbol}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-[var(--glide-muted)]">
                <UnverifiedPill />
                <span className="truncate tabular-nums">{amountText(token)}</span>
              </p>
            </div>
            <ChevronRight
              className="h-5 w-5 shrink-0 text-[var(--glide-muted)]"
              strokeWidth={2}
              aria-hidden
            />
          </Link>
        ))}

        {hidden.length > 0 ? (
          <>
            <button
              type="button"
              onClick={() => setShowHidden((v) => !v)}
              aria-expanded={showHidden}
              className="glide-tap flex w-full items-center justify-between px-4 py-3 text-left text-[13px] font-semibold text-[var(--glide-muted)]"
            >
              Hidden tokens ({hidden.length})
              <ChevronDown
                className="h-4 w-4"
                strokeWidth={2.25}
                style={{ transform: showHidden ? "rotate(180deg)" : undefined }}
                aria-hidden
              />
            </button>
            {showHidden
              ? hidden.map((token) => (
                  <div
                    key={token.tokenAddress}
                    className="flex items-center gap-3 px-4 py-3 opacity-70"
                  >
                    <TokenIcon symbol={token.symbol} size={40} unverified />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold tracking-tight text-[var(--glide-text)]">
                        {token.symbol}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-[var(--glide-muted)]">
                        <span
                          className="shrink-0 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold"
                          style={{
                            background: "color-mix(in srgb, var(--glide-error) 14%, transparent)",
                            color: "var(--glide-error)",
                          }}
                        >
                          Possible scam
                        </span>
                        <span className="truncate tabular-nums">{amountText(token)}</span>
                      </p>
                    </div>
                  </div>
                ))
              : null}
          </>
        ) : null}
      </div>
    </section>
  );
}

function UnverifiedPill() {
  return (
    <span className="shrink-0 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10.5px] font-semibold text-amber-700 dark:text-amber-300">
      Unverified
    </span>
  );
}
