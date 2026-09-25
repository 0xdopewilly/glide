import { ARC_NETWORK } from "@/lib/network";

/** Arc USDC - Circle native token uses empty address on transfers. */
export const ARC_USDC_TOKEN_ADDRESS = "";

/** Arc EURC on the active network (Circle / Arc docs). */
export const ARC_EURC_TOKEN_ADDRESS = ARC_NETWORK.eurcAddress;

/** Arc cirBTC (Circle Bitcoin) on the active network. */
export const ARC_CIRBTC_TOKEN_ADDRESS = ARC_NETWORK.cirBtcAddress;

/** Arc USDC's ERC-20 interface (same on mainnet and testnet). Circle also
 * reports USDC as the chain's native token with no address. */
export const ARC_USDC_ERC20_ADDRESS = "0x3600000000000000000000000000000000000000";

/** Identify an Arc token by contract address — never by symbol or name,
 * which anyone can spoof (airdropped "USDC" spam is routine on mainnet).
 * Returns null for anything that isn't one of the tokens glidepay supports. */
export function classifyArcToken(token: {
  tokenAddress?: string | null;
  isNative?: boolean | null;
}): "USDC" | "EURC" | "cirBTC" | null {
  const address = token.tokenAddress?.trim();
  if (!address) return token.isNative ? "USDC" : null;
  if (addressesEqual(address, ARC_USDC_ERC20_ADDRESS)) return "USDC";
  if (addressesEqual(address, ARC_EURC_TOKEN_ADDRESS)) return "EURC";
  if (addressesEqual(address, ARC_CIRBTC_TOKEN_ADDRESS)) return "cirBTC";
  return null;
}

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

/** Balance of a verified token by symbol. Unverified tokens are skipped: a
 * fake "USDC" must never be read as the user's USDC. */
export function tokenAmountFromBalances(
  tokens: { symbol: string; amount: number; verified?: boolean }[],
  symbol?: string | null,
): number {
  const target = normalizeTokenSymbol(symbol);
  const row = tokens.find(
    (t) => t.verified !== false && normalizeTokenSymbol(t.symbol) === target,
  );
  return row?.amount ?? 0;
}

/** Dollar total of the wallet. Only verified tokens with a real market value
 * count: an unverified token (a meme, an airdrop, a fake "USDC") or a token
 * whose price is unavailable adds nothing. Never falls back to counting one
 * token as one dollar. */
export function totalUsdFromTokens(
  tokens: { usdValue: number; verified?: boolean }[],
): number {
  return tokens.reduce(
    (sum, t) =>
      t.verified === false || !(t.usdValue > 0) ? sum : sum + t.usdValue,
    0,
  );
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
    // Currency-sign rows only ("+$5", "−€3"). An unverified token's label
    // carries its symbol ("−1,000,000 PEPE") and is not money we can value.
    if (/[A-Za-z]/.test(tx.amount)) continue;
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
  tokens: { usdValue: number; verified?: boolean }[],
  usdcBalance = 0,
  activityFallback?: number,
): number {
  const fromTokens = totalUsdFromTokens(tokens);
  if (fromTokens > 0) return fromTokens;
  if (usdcBalance > 0) return usdcBalance;
  if (activityFallback && activityFallback > 0) return activityFallback;
  return 0;
}
