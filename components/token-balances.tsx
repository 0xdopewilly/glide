"use client";

import { TokenIcon } from "@/components/token-icon";
import { usePrivacy } from "@/context/privacy-context";
import { formatUsd } from "@/lib/format";
import type { GlideTokenBalance } from "@/lib/types";
import { MoreHorizontal } from "lucide-react";
import Link from "next/link";

function formatTokenAmount(amount: number) {
  if (amount === 0) return "0";
  if (amount < 0.0001) return amount.toExponential(2);
  if (amount < 1) return amount.toFixed(6);
  if (amount < 100) return amount.toFixed(4);
  return amount.toFixed(2);
}

// TODO: 24h change should come from a real price source later.
function getChange24h(token: GlideTokenBalance): number {
  const t = token as GlideTokenBalance & { change24h?: number };
  return typeof t.change24h === "number" ? t.change24h : 0;
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
    <section className="flex flex-col gap-3" aria-label="Assets">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-[color:var(--glide-on-surface)]">
          Assets
        </h2>
        <Link
          href="/payments"
          className="text-sm font-semibold text-[color:var(--glide-primary)] hover:text-[color:var(--glide-primary-hover)]"
        >
          Manage
        </Link>
      </div>

      {loading && tokens.length === 0 ? (
        <ul className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i}>
              <div
                className="flex items-center gap-3 rounded-2xl border bg-[color:var(--glide-surface-elevated)] p-3.5"
                style={{ borderColor: "var(--glide-elevated-border)" }}
              >
                <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-[color:var(--glide-surface-container)]" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3 w-16 animate-pulse rounded bg-[color:var(--glide-surface-container)]" />
                  <div className="h-2.5 w-24 animate-pulse rounded bg-[color:var(--glide-surface-container)]" />
                </div>
                <div className="space-y-2 text-right">
                  <div className="ml-auto h-3 w-14 animate-pulse rounded bg-[color:var(--glide-surface-container)]" />
                  <div className="ml-auto h-2.5 w-10 animate-pulse rounded bg-[color:var(--glide-surface-container)]" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="flex flex-col gap-2">
          {tokens.map((token) => {
            const change = getChange24h(token);
            const amountLabel = hideBalance
              ? "····"
              : `${formatTokenAmount(token.amount)} ${token.symbol}`;
            const usdLabel = hideBalance ? "····" : `$${formatUsd(token.usdValue)}`;

            const changeColor =
              change > 0
                ? "text-[color:var(--glide-success)]"
                : change < 0
                  ? "text-[color:var(--glide-error)]"
                  : "text-[color:var(--glide-on-elevated-variant)]";

            return (
              <li key={`${token.symbol}-${token.chainId}`}>
                <article
                  className="flex items-center gap-3 rounded-2xl border bg-[color:var(--glide-surface-elevated)] p-3.5"
                  style={{ borderColor: "var(--glide-elevated-border)" }}
                >
                  <TokenIcon symbol={token.symbol} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[color:var(--glide-on-elevated)]">
                      {token.symbol}
                    </p>
                    <p
                      className="truncate text-xs font-medium tabular-nums text-[color:var(--glide-on-elevated-variant)]"
                      style={{
                        fontFamily:
                          "var(--font-geist-mono), ui-monospace, monospace",
                      }}
                    >
                      {amountLabel}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold tabular-nums text-[color:var(--glide-on-elevated)]">
                      {usdLabel}
                    </p>
                    <p
                      className={`text-xs font-medium tabular-nums ${changeColor}`}
                    >
                      {change > 0 ? "+" : ""}
                      {change.toFixed(2)}%
                    </p>
                  </div>
                  <button
                    type="button"
                    className="ml-1 rounded-full p-1.5 text-[color:var(--glide-on-elevated-variant)] transition-colors hover:bg-[color:var(--glide-surface-container)]"
                    aria-label={`More options for ${token.symbol}`}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
