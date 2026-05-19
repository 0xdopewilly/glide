"use client";

import { ChainIcon } from "@/components/chain-icon";
import { TokenIcon } from "@/components/token-icon";
import { getChainMeta, type GlideChainKey } from "@/lib/chain-meta";
import { formatUsd } from "@/lib/format";
import { getTokenDisplayName } from "@/lib/token-meta";
import { isUsdcToken } from "@/lib/tokens";
import type { GlideTokenBalance } from "@/lib/types";
import Link from "next/link";
import { useMemo } from "react";

const CHAIN_ORDER: GlideChainKey[] = [
  "arc-testnet",
  "ethereum-sepolia",
  "base-sepolia",
  "polygon-amoy",
  "arbitrum-sepolia",
];

function groupByChain(tokens: GlideTokenBalance[]) {
  const map = new Map<GlideChainKey, GlideTokenBalance[]>();
  for (const token of tokens) {
    const list = map.get(token.chainId) ?? [];
    list.push(token);
    map.set(token.chainId, list);
  }
  return CHAIN_ORDER.filter((id) => map.has(id)).map((chainId) => ({
    chainId,
    meta: getChainMeta(chainId),
    tokens: map.get(chainId)!,
  }));
}

export function TokenBalances({ tokens }: { tokens: GlideTokenBalance[] }) {
  const visible = tokens.filter(
    (t) =>
      t.amount > 0 ||
      (t.chainId === "arc-testnet" &&
        (t.symbol === "USDC" || t.symbol === "EURC")),
  );

  const groups = useMemo(() => groupByChain(visible), [visible]);

  if (groups.length === 0) return null;

  return (
    <section className="mt-8" aria-label="Balances by network">
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-neutral-500 dark:text-white/50">
        Your balances
      </h2>
      <div className="flex flex-col gap-5">
        {groups.map(({ chainId, meta, tokens: chainTokens }) => (
          <div key={chainId}>
            <div className="mb-2 flex items-center gap-2">
              <ChainIcon chainId={chainId} />
              <p className="text-xs font-semibold tracking-tight text-neutral-700 dark:text-white/75">
                {meta.label}
              </p>
            </div>
            <ul className="flex flex-col gap-2">
              {chainTokens.map((token) => (
                <li key={`${chainId}-${token.symbol}`}>
                  <TokenRow token={token} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function TokenRow({ token }: { token: GlideTokenBalance }) {
  const { symbol, amount, chainId } = token;
  const canSwap =
    chainId === "arc-testnet" && isUsdcToken(symbol) && amount > 0;

  const inner = (
    <div className="flex items-center gap-3 rounded-2xl bg-neutral-100 px-3 py-3 dark:bg-[#1c1c1e]">
      <div className="relative shrink-0">
        <TokenIcon symbol={symbol} size={44} />
        {chainId !== "arc-testnet" ? (
          <span className="absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-neutral-100 dark:ring-[#1c1c1e]">
            <ChainIcon chainId={chainId} size="sm" />
          </span>
        ) : null}
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="text-[15px] font-semibold tracking-tight text-neutral-950 dark:text-white">
          {symbol}
        </p>
        <p className="mt-0.5 truncate text-xs font-medium text-neutral-500 dark:text-white/45">
          {amount > 0 ? getTokenDisplayName(symbol) : "No balance"}
        </p>
      </div>
      <p className="shrink-0 text-[15px] font-semibold tabular-nums tracking-tight text-neutral-950 dark:text-white">
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
