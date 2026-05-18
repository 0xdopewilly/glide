/** Arc testnet USDC — Circle native token uses empty address on transfers. */
export const ARC_USDC_TOKEN_ADDRESS = "";

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

export function totalUsdFromTokens(tokens: { usdValue: number }[]): number {
  return tokens.reduce((sum, t) => sum + t.usdValue, 0);
}
