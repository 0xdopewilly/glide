"use client";

import type { StableToken } from "@/lib/currency-format";

export function StableTokenSegment({
  value,
  onChange,
  className = "",
}: {
  value: StableToken;
  onChange: (token: StableToken) => void;
  className?: string;
}) {
  return (
    <div
      className={`glide-m3-segment flex rounded-full p-1 ${className}`}
      role="tablist"
      aria-label="Stablecoin"
    >
      {(["USDC", "EURC"] as const).map((token) => (
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
