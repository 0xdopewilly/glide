/** Arc testnet USDC - Circle native token uses empty address on transfers. */
export const ARC_USDC_TOKEN_ADDRESS = "";

/** Arc testnet EURC (Circle / Arc docs). */
export const ARC_EURC_TOKEN_ADDRESS =
  "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a";

/** Arc testnet cirBTC (Circle Bitcoin). */
export const ARC_CIRBTC_TOKEN_ADDRESS =
  "0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF";

export function arcTokenAddressForSymbol(symbol?: string | null): string {
  if (isEurcToken(symbol)) return ARC_EURC_TOKEN_ADDRESS;
  if (isCirBtcToken(symbol)) return ARC_CIRBTC_TOKEN_ADDRESS;
  return ARC_USDC_TOKEN_ADDRESS;
}

export const USDC_SYMBOLS = new Set(["USDC", "USDCE", "USDC.E"]);
export const EURC_SYMBOLS = new Set(["EURC", "EURC.E"]);
export const CIRBTC_SYMBOLS = new Set(["CIRBTC", "CIRBTC.E", "CIR-BTC"]);

/** Tokens shown on the home dashboard (in order). */
export const ARC_DISPLAY_TOKENS = ["USDC", "EURC", "cirBTC"] as const;

export function normalizeTokenSymbol(symbol?: string | null): string {
  if (!symbol?.trim()) return "USDC";
  const upper = symbol.trim().toUpperCase();
  // Preserve cirBTC's mixed-case canonical form when matched.
  if (CIRBTC_SYMBOLS.has(upper)) return "cirBTC";
  return upper;
}

export function isUsdcToken(symbol?: string | null): boolean {
  return USDC_SYMBOLS.has((symbol ?? "").trim().toUpperCase());
}

export function isEurcToken(symbol?: string | null): boolean {
  return EURC_SYMBOLS.has((symbol ?? "").trim().toUpperCase());
}

export function isCirBtcToken(symbol?: string | null): boolean {
  return CIRBTC_SYMBOLS.has((symbol ?? "").trim().toUpperCase());
}

/** Any Arc-native token glidepay supports (USDC, EURC, cirBTC). Name kept for compat. */
export function isArcStablecoin(symbol?: string | null): boolean {
  const s = (symbol ?? "").trim().toUpperCase();
  return USDC_SYMBOLS.has(s) || EURC_SYMBOLS.has(s) || CIRBTC_SYMBOLS.has(s);
}

export function addressesEqual(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}

export function tokenAmountFromBalances(
  tokens: { symbol: string; amount: number }[],
  symbol?: string | null,
): number {
  const target = normalizeTokenSymbol(symbol);
  const row = tokens.find((t) => normalizeTokenSymbol(t.symbol) === target);
  return row?.amount ?? 0;
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

/** Signed net USD flow (received − sent) over transactions created within the
 * last `windowMs` (default 24h). Used for the home "today" delta. Direction
 * comes from `variant` (debit labels use a U+2212 minus, not an ASCII sign),
 * so we take the magnitude and apply the sign from the variant. Swaps/bridges
 * (neutral) don't change the total and are ignored. */
export function netFlowUsd(
  transactions: { variant?: string; amount: string; createdAt?: string }[],
  windowMs = 24 * 60 * 60 * 1000,
): number {
  const since = Date.now() - windowMs;
  let net = 0;
  for (const tx of transactions) {
    if (!tx.createdAt) continue;
    const t = new Date(tx.createdAt).getTime();
    if (Number.isNaN(t) || t < since) continue;
    const n = parseSignedUsdAmount(tx.amount);
    if (n === null) continue;
    const mag = Math.abs(n);
    if (tx.variant === "credit") net += mag;
    else if (tx.variant === "debit") net -= mag;
  }
  return net;
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
