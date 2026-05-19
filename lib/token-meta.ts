/** Token logos — local assets under /public/tokens when available. */
export const TOKEN_LOGOS: Record<string, string> = {
  USDC: "/tokens/usdc.png",
  USDCE: "/tokens/usdc.png",
  "USDC.E": "/tokens/usdc.png",
  EURC: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x1aBaEA1f781339c5bbD94289B7eB04a535A97a49/logo.png",
  "EURC.E": "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x1aBaEA1f781339c5bbD94289B7eB04a535A97a49/logo.png",
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
