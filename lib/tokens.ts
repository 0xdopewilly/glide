/** Arc testnet USDC — Circle native token uses empty address on transfers. */
export const ARC_USDC_TOKEN_ADDRESS = "";

/** Arc testnet EURC (Circle / Arc docs). */
export const ARC_EURC_TOKEN_ADDRESS =
  "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a";

export function arcTokenAddressForSymbol(symbol?: string | null): string {
  return isEurcToken(symbol)
    ? ARC_EURC_TOKEN_ADDRESS
    : ARC_USDC_TOKEN_ADDRESS;
}

export const USDC_SYMBOLS = new Set(["USDC", "USDCE", "USDC.E"]);
export const EURC_SYMBOLS = new Set(["EURC", "EURC.E"]);

/** Tokens shown on the home dashboard (in order). */
export const ARC_DISPLAY_TOKENS = ["USDC", "EURC"] as const;

export function normalizeTokenSymbol(symbol?: string | null): string {
  if (!symbol?.trim()) return "USDC";
  return symbol.trim().toUpperCase();
}

export function isUsdcToken(symbol?: string | null): boolean {
  return USDC_SYMBOLS.has(normalizeTokenSymbol(symbol));
}

export function isEurcToken(symbol?: string | null): boolean {
  return EURC_SYMBOLS.has(normalizeTokenSymbol(symbol));
}

export function isArcStablecoin(symbol?: string | null): boolean {
  const s = normalizeTokenSymbol(symbol);
  return USDC_SYMBOLS.has(s) || EURC_SYMBOLS.has(s);
}

export function addressesEqual(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}

export function totalUsdFromTokens(
  tokens: { usdValue: number; amount: number }[],
): number {
  return tokens.reduce((sum, t) => {
    const v = t.usdValue > 0 ? t.usdValue : t.amount > 0 ? t.amount : 0;
    return sum + v;
  }, 0);
}

/** Sum completed credits minus debits from activity (fallback when Circle lags). */
export function estimateNetUsdFromTransactions(
  transactions: { variant?: string; amount: string }[],
): number {
  let net = 0;
  for (const tx of transactions) {
    const n = parseSignedUsdAmount(tx.amount);
    if (n === null) continue;
    if (tx.variant === "credit") net += n;
    else if (tx.variant === "debit") net -= n;
  }
  return Math.max(0, net);
}

function parseSignedUsdAmount(amount: string): number | null {
  const cleaned = amount.replace(/,/g, "").trim();
  const m = cleaned.match(/([+-])?\s*\$?\s*([\d.]+)/);
  if (!m) return null;
  const n = parseFloat(m[2]);
  if (Number.isNaN(n)) return null;
  if (m[1] === "-") return -n;
  if (m[1] === "+") return n;
  return n;
}

/** Prefer on-chain totals; fall back to USDC balance, then recent activity. */
export function resolveWalletTotalUsd(
  tokens: { usdValue: number; amount: number }[],
  usdcBalance = 0,
  activityFallback?: number,
): number {
  const fromTokens = totalUsdFromTokens(tokens);
  if (fromTokens > 0) return fromTokens;
  if (usdcBalance > 0) return usdcBalance;
  if (activityFallback && activityFallback > 0) return activityFallback;
  return 0;
}
