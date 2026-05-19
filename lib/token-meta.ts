/** Token logos (Trust Wallet asset CDN). */
export const TOKEN_LOGOS: Record<string, string> = {
  USDC: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png",
  USDCE: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png",
  "USDC.E": "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png",
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
