import { isEurcToken, normalizeTokenSymbol } from "@/lib/tokens";

export type StableToken = "USDC" | "EURC";

export function stableTokenFromSymbol(symbol?: string | null): StableToken {
  return isEurcToken(symbol) ? "EURC" : "USDC";
}

/** Display prefix for stablecoin amounts (USDC → $, EURC → €). */
export function currencyPrefixForToken(symbol?: string | null): string {
  return stableTokenFromSymbol(symbol) === "EURC" ? "€" : "$";
}

export function formatStableAmount(
  amount: string | number,
  symbol?: string | null,
): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  const value = Number.isFinite(n) ? n.toFixed(2) : "0.00";
  return `${currencyPrefixForToken(symbol)}${value}`;
}

export function formatStableAmountWithCode(
  amount: string | number,
  symbol?: string | null,
): string {
  const token = normalizeTokenSymbol(symbol);
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  const value = Number.isFinite(n) ? n.toFixed(2) : "0.00";
  return `${currencyPrefixForToken(token)}${value} ${token}`;
}
