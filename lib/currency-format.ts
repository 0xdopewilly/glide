import {
  isCirBtcToken,
  isEurcToken,
  normalizeTokenSymbol,
} from "@/lib/tokens";

/** All Arc-native tokens glidepay supports today. Name kept "Stable" for compat
 *  even though cirBTC isn't a stablecoin. */
export type StableToken = "USDC" | "EURC" | "cirBTC";

export function stableTokenFromSymbol(symbol?: string | null): StableToken {
  if (isEurcToken(symbol)) return "EURC";
  if (isCirBtcToken(symbol)) return "cirBTC";
  return "USDC";
}

/** Display prefix for token amounts (USDC → $, EURC → €, cirBTC → ₿). */
export function currencyPrefixForToken(symbol?: string | null): string {
  const t = stableTokenFromSymbol(symbol);
  if (t === "EURC") return "€";
  if (t === "cirBTC") return "₿";
  return "$";
}

/** How many decimal places to display by default. BTC needs more precision. */
function decimalsForToken(symbol?: string | null): number {
  return stableTokenFromSymbol(symbol) === "cirBTC" ? 8 : 2;
}

function formatNumber(n: number, decimals: number): string {
  if (!Number.isFinite(n)) return decimals === 8 ? "0.00000000" : "0.00";
  // Trim trailing zeros for BTC display (e.g. 0.50000000 → 0.5)
  if (decimals === 8) {
    return n.toFixed(8).replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "");
  }
  return n.toFixed(decimals);
}

export function formatStableAmount(
  amount: string | number,
  symbol?: string | null,
): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return `${currencyPrefixForToken(symbol)}${formatNumber(n, decimalsForToken(symbol))}`;
}

export function formatStableAmountWithCode(
  amount: string | number,
  symbol?: string | null,
): string {
  const token = normalizeTokenSymbol(symbol);
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return `${currencyPrefixForToken(token)}${formatNumber(n, decimalsForToken(token))} ${token}`;
}
