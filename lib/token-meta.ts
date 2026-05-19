/** Token logos — local assets under /public/tokens when available. */
export const TOKEN_LOGOS: Record<string, string> = {
  USDC: "/tokens/usdc.png",
  USDCE: "/tokens/usdc.png",
  "USDC.E": "/tokens/usdc.png",
  EURC: "/tokens/eurc.png",
  "EURC.E": "/tokens/eurc.png",
};

export function getTokenLogo(symbol: string): string | undefined {
  return TOKEN_LOGOS[symbol.trim().toUpperCase()];
}

export function getTokenDisplayName(symbol: string): string {
  const s = symbol.trim().toUpperCase();
  if (s === "USDC" || s === "USDCE" || s === "USDC.E") return "USD Coin";
  if (s === "EURC" || s === "EURC.E") return "Euro Coin";
  return symbol;
}
