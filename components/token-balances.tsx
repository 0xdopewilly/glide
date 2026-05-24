"use client";

import { ChainIcon } from "@/components/chain-icon";
import { TokenIcon } from "@/components/token-icon";
import { getChainMeta, type GlideChainKey } from "@/lib/chain-meta";
import { formatUsd } from "@/lib/format";
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

function formatTokenAmount(amount: number) {
  if (amount === 0) return "0";
  if (amount < 0.0001) return amount.toExponential(2);
  if (amount < 1) return amount.toFixed(6);
  if (amount < 100) return amount.toFixed(4);
  return amount.toFixed(2);
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
      <h2 className="glide-label-mono mb-3 text-[11px] font-semibold text-[var(--glide-muted)]">
        Balances
      </h2>
      <div className="flex flex-col gap-5">
        {groups.map(({ chainId, meta, tokens: chainTokens }) => (
          <div key={chainId}>
            <div className="mb-1 flex items-center gap-2">
              <ChainIcon chainId={chainId} size="sm" />
              <p className="glide-label-mono text-[11px] font-semibold text-[var(--glide-muted)]">
                {meta.label}
              </p>
            </div>
            <ul className="glide-stagger flex flex-col">
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
    <div
      className="flex items-center gap-3 border-b py-3.5"
      style={{ borderColor: "var(--glide-border)" }}
    >
      <div className="relative shrink-0">
        <TokenIcon symbol={symbol} size={40} />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="glide-label-mono text-[14px] font-bold text-[var(--glide-text)]">
          {symbol}
        </p>
        <p
          className="mt-0.5 truncate text-[12px] font-medium tabular-nums text-[var(--glide-muted)]"
          style={{ fontFamily: "var(--font-geist-mono), ui-monospace, monospace" }}
        >
          {amount > 0 ? `${formatTokenAmount(amount)} ${symbol}` : "No balance"}
        </p>
      </div>
      <p className="shrink-0 text-[15px] font-bold tabular-nums tracking-tight text-[var(--glide-text)]">
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
