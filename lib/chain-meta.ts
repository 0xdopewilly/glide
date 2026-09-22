import type { BridgeNetworkKey } from "@/lib/app-kit";
import { ARC_NETWORK, EXTERNAL_CHAINS } from "@/lib/network";

/** Internal chain keys. The ids keep their original testnet-era names because
 * cached balances reference them; labels follow the active network. */
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
  /** Optional logo under /public/chains */
  logo?: string;
  /** How the logo fits the circular badge (default cover). */
  logoFit?: "cover" | "contain";
};

export const CHAIN_META: Record<GlideChainKey, ChainMeta> = {
  "arc-testnet": {
    id: "arc-testnet",
    label: ARC_NETWORK.label,
    shortLabel: "Arc",
    badgeClass: "from-[#1a4a7a] to-[#001030]",
    color: "#1a4a7a",
    logo: "/chains/arc.png",
  },
  "ethereum-sepolia": {
    id: "ethereum-sepolia",
    label: EXTERNAL_CHAINS.ethereum.networkLabel,
    shortLabel: "ETH",
    badgeClass: "from-[#627EEA] to-[#3C5BD8]",
    color: "#627EEA",
    logo: "/chains/ethereum.png",
  },
  "base-sepolia": {
    id: "base-sepolia",
    label: EXTERNAL_CHAINS.base.networkLabel,
    shortLabel: "Base",
    badgeClass: "from-[#0052FF] to-[#0038B8]",
    color: "#0052FF",
  },
  "polygon-amoy": {
    id: "polygon-amoy",
    label: EXTERNAL_CHAINS.polygon.networkLabel,
    shortLabel: "POL",
    badgeClass: "from-[#8247E5] to-[#6C3BB8]",
    color: "#8247E5",
    logo: "/chains/polygon.png",
  },
  "arbitrum-sepolia": {
    id: "arbitrum-sepolia",
    label: EXTERNAL_CHAINS.arbitrum.networkLabel,
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
