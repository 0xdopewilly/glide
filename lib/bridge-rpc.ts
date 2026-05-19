import { fallback, http, type Chain, type Transport } from "viem";

/** Reliable public RPCs for bridge balance reads (Circle RPC can fail on Sepolia). */
export const BRIDGE_READ_RPC_BY_CHAIN_ID: Record<number, readonly string[]> = {
  5042002: ["https://rpc.testnet.arc.network"],
  11155111: [
    "https://ethereum-sepolia-rpc.publicnode.com",
    "https://1rpc.io/sepolia",
    "https://rpc.sepolia.org",
  ],
  84532: [
    "https://sepolia.base.org",
    "https://base-sepolia-rpc.publicnode.com",
  ],
  80002: ["https://rpc-amoy.polygon.technology"],
  421614: ["https://sepolia-rollup.arbitrum.io/rpc"],
};

const ENV_BY_CHAIN_ID: Record<number, string> = {
  5042002: "BRIDGE_READ_RPC_ARC",
  11155111: "BRIDGE_READ_RPC_ETHEREUM_SEPOLIA",
  84532: "BRIDGE_READ_RPC_BASE_SEPOLIA",
  80002: "BRIDGE_READ_RPC_POLYGON_AMOY",
  421614: "BRIDGE_READ_RPC_ARBITRUM_SEPOLIA",
};

export function bridgeReadRpcUrls(chainId: number): readonly string[] {
  const envVar = ENV_BY_CHAIN_ID[chainId];
  const override = envVar ? process.env[envVar]?.trim() : "";
  if (override) return [override];
  return BRIDGE_READ_RPC_BY_CHAIN_ID[chainId] ?? [];
}

export function createBridgeReadTransport(
  chain: Chain,
  signingFallback: Transport,
): Transport {
  const urls = bridgeReadRpcUrls(chain.id);
  if (urls.length === 0) return signingFallback;
  return fallback([
    ...urls.map((url) =>
      http(url, {
        timeout: 12_000,
        retryCount: 2,
      }),
    ),
    signingFallback,
  ]);
}
