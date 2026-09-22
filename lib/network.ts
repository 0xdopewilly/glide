/** Which Arc network this deployment runs on. One deployment = one network:
 * mainnet and testnet run as separate Vercel projects with separate databases,
 * so wallets and activity never mix. NEXT_PUBLIC_ so client code (explorer
 * links, testnet badges) sees the same value at build time; it is not a
 * secret. Anything other than "mainnet" (including unset) means testnet, so
 * existing deployments keep their current behavior.
 *
 * Client-safe: no server-only imports. Server-only chain objects (App Kit,
 * viem) are selected from this in lib/app-kit.ts, lib/gas-refill.ts and
 * lib/chain-balances.ts. */
export type GlideNetwork = "mainnet" | "testnet";

export const GLIDE_NETWORK: GlideNetwork =
  process.env.NEXT_PUBLIC_GLIDE_NETWORK?.trim().toLowerCase() === "mainnet"
    ? "mainnet"
    : "testnet";

export const IS_MAINNET = GLIDE_NETWORK === "mainnet";

type ArcNetworkConfig = {
  /** Circle Wallets blockchain id. */
  circleBlockchain: "ARC" | "ARC-TESTNET";
  chainId: number;
  label: string;
  /** Block explorer origin, no trailing slash. */
  explorerOrigin: string;
  eurcAddress: string;
  cirBtcAddress: string;
};

// Addresses: docs.arc.io/arc/references/contract-addresses, cross-checked
// against @circle-fin/app-kit/chains (Arc, ArcTestnet).
const ARC_BY_NETWORK: Record<GlideNetwork, ArcNetworkConfig> = {
  mainnet: {
    circleBlockchain: "ARC",
    chainId: 5042,
    label: "Arc",
    explorerOrigin: "https://explorer.arc.io",
    eurcAddress: "0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1",
    cirBtcAddress: "0x171A4217b86A807A64eB94757Db6849fb4bDbAA0",
  },
  testnet: {
    circleBlockchain: "ARC-TESTNET",
    chainId: 5042002,
    label: "Arc Testnet",
    explorerOrigin: "https://testnet.arcscan.app",
    eurcAddress: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
    cirBtcAddress: "0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF",
  },
};

export const ARC_NETWORK = ARC_BY_NETWORK[GLIDE_NETWORK];

/** Network-neutral keys for the external chains glidepay receives from
 * (Universal Receive) and bridges to. */
export type ExternalChainKey = "base" | "ethereum" | "polygon" | "arbitrum";

type ExternalChainConfig = {
  /** Circle Wallets blockchain id on this network. */
  circleBlockchain: string;
  /** Short label used in copy ("Received via Base"). */
  label: string;
  /** Full network label for chain badges ("Base Sepolia" on testnet). */
  networkLabel: string;
};

const EXTERNAL_BY_NETWORK: Record<
  GlideNetwork,
  Record<ExternalChainKey, ExternalChainConfig>
> = {
  mainnet: {
    base: { circleBlockchain: "BASE", label: "Base", networkLabel: "Base" },
    ethereum: { circleBlockchain: "ETH", label: "Ethereum", networkLabel: "Ethereum" },
    polygon: { circleBlockchain: "MATIC", label: "Polygon", networkLabel: "Polygon" },
    arbitrum: { circleBlockchain: "ARB", label: "Arbitrum", networkLabel: "Arbitrum" },
  },
  testnet: {
    base: { circleBlockchain: "BASE-SEPOLIA", label: "Base", networkLabel: "Base Sepolia" },
    ethereum: { circleBlockchain: "ETH-SEPOLIA", label: "Ethereum", networkLabel: "Ethereum Sepolia" },
    polygon: { circleBlockchain: "MATIC-AMOY", label: "Polygon", networkLabel: "Polygon Amoy" },
    arbitrum: { circleBlockchain: "ARB-SEPOLIA", label: "Arbitrum", networkLabel: "Arbitrum Sepolia" },
  },
};

export const EXTERNAL_CHAINS = EXTERNAL_BY_NETWORK[GLIDE_NETWORK];

export function arcExplorerTxUrl(txHash: string): string {
  return `${ARC_NETWORK.explorerOrigin}/tx/${txHash}`;
}
