import type { BridgeNetworkKey } from "@/lib/app-kit";

export type GlideChainKey =
  | "arc-testnet"
  | "ethereum-sepolia"
  | "base-sepolia"
  | "polygon-amoy"
  | "arbitrum-sepolia";

export type ChainMeta = {
  id: GlideChainKey;
  label: string;
  shortLabel: string;
  /** Tailwind gradient for chain badge */
  badgeClass: string;
  /** Brand hex for accents */
  color: string;
};

export const CHAIN_META: Record<GlideChainKey, ChainMeta> = {
  "arc-testnet": {
    id: "arc-testnet",
    label: "Arc Testnet",
    shortLabel: "Arc",
    badgeClass: "from-sky-500 to-violet-600",
    color: "#6366f1",
  },
  "ethereum-sepolia": {
    id: "ethereum-sepolia",
    label: "Ethereum Sepolia",
    shortLabel: "ETH",
    badgeClass: "from-[#627EEA] to-[#3C5BD8]",
    color: "#627EEA",
  },
  "base-sepolia": {
    id: "base-sepolia",
    label: "Base Sepolia",
    shortLabel: "Base",
    badgeClass: "from-[#0052FF] to-[#0038B8]",
    color: "#0052FF",
  },
  "polygon-amoy": {
    id: "polygon-amoy",
    label: "Polygon Amoy",
    shortLabel: "POL",
    badgeClass: "from-[#8247E5] to-[#6C3BB8]",
    color: "#8247E5",
  },
  "arbitrum-sepolia": {
    id: "arbitrum-sepolia",
    label: "Arbitrum Sepolia",
    shortLabel: "ARB",
    badgeClass: "from-[#28A0F0] to-[#1B7ACC]",
    color: "#28A0F0",
  },
};

export const BRIDGE_KEY_TO_CHAIN: Record<BridgeNetworkKey, GlideChainKey> = {
  ethereum: "ethereum-sepolia",
  base: "base-sepolia",
  polygon: "polygon-amoy",
  arbitrum: "arbitrum-sepolia",
};

export function getChainMeta(chainId: GlideChainKey): ChainMeta {
  return CHAIN_META[chainId];
}
