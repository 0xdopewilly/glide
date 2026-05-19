"use client";

import type { GlideTokenBalance } from "@/lib/types";
import { formatUsd } from "@/lib/format";
import Link from "next/link";

export function TokenBalances({ tokens }: { tokens: GlideTokenBalance[] }) {
  const visible = tokens.filter(
    (t) => t.amount > 0 || t.symbol === "USDC" || t.symbol === "EURC",
  );
  if (visible.length === 0) return null;

  return (
    <section className="mt-8" aria-label="Your tokens on Arc">
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-neutral-500 dark:text-white/50">
        On Arc testnet
      </h2>
      <ul className="flex flex-col gap-2">
        {visible.map((token) => (
          <li key={token.symbol}>
            <TokenRow token={token} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function TokenRow({ token }: { token: GlideTokenBalance }) {
  const { symbol, amount } = token;
  const canSwap = symbol === "USDC" && amount > 0;

  const inner = (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-neutral-100 px-4 py-3.5 dark:bg-[#1c1c1e]">
      <div className="min-w-0 text-left">
        <p className="text-[15px] font-semibold tracking-tight text-neutral-950 dark:text-white">
          {symbol}
        </p>
        <p className="mt-0.5 text-xs font-medium text-neutral-500 dark:text-white/45">
          {amount > 0 ? "Available" : "No balance"}
        </p>
      </div>
      <p className="shrink-0 text-[15px] font-semibold tracking-tight text-neutral-950 dark:text-white">
        ${formatUsd(amount)}
      </p>
    </div>
  );

  if (canSwap) {
    return (
      <Link
        href="/swap"
        className="glide-tap block transition-opacity hover:opacity-90"
      >
        {inner}
      </Link>
    );
  }

  return inner;
}
