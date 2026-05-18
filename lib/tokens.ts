/** Arc testnet USDC — Circle native token uses empty address on transfers. */
export const ARC_USDC_TOKEN_ADDRESS = "";

export const USDC_SYMBOLS = new Set(["USDC", "USDCE", "USDC.E"]);

export function isUsdcToken(symbol?: string | null): boolean {
  if (!symbol) return true;
  return USDC_SYMBOLS.has(symbol.toUpperCase());
}
