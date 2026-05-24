"use client";

import type { StableToken } from "@/lib/currency-format";

export function StableTokenSegment({
  value,
  onChange,
  tokens = ["USDC", "EURC", "cirBTC"],
  className = "",
}: {
  value: StableToken;
  onChange: (token: StableToken) => void;
  /** Subset of tokens to display. Defaults to all three. */
  tokens?: readonly StableToken[];
  className?: string;
}) {
  return (
    <div
      className={`glide-m3-segment flex rounded-full p-1 ${className}`}
      role="tablist"
      aria-label="Token"
    >
      {tokens.map((token) => (
        <button
          key={token}
          type="button"
          role="tab"
          aria-selected={value === token}
          onClick={() => onChange(token)}
          className={`glide-tap flex-1 rounded-full py-2 text-xs font-semibold tracking-tight transition-colors ${
            value === token
              ? "bg-[var(--glide-surface)] text-[var(--glide-text)] shadow-sm"
              : "text-[var(--glide-muted)]"
          }`}
        >
          {token}
        </button>
      ))}
    </div>
  );
}
