import { createCircleWalletsAdapter } from "@circle-fin/adapter-circle-wallets";
import { AppKit } from "@circle-fin/app-kit";
import {
  ArcTestnet,
  ArbitrumSepolia,
  BaseSepolia,
  EthereumSepolia,
  PolygonAmoy,
} from "@circle-fin/app-kit/chains";
import type { BridgeResult } from "@circle-fin/bridge-kit";

export const BRIDGE_NETWORKS = {
  ethereum: { chain: EthereumSepolia, label: "Ethereum" },
  base: { chain: BaseSepolia, label: "Base" },
  polygon: { chain: PolygonAmoy, label: "Polygon" },
  arbitrum: { chain: ArbitrumSepolia, label: "Arbitrum" },
} as const;

export type BridgeNetworkKey = keyof typeof BRIDGE_NETWORKS;

type GlideAppKit = {
  kit: AppKit;
  adapter: ReturnType<typeof createCircleWalletsAdapter>;
  kitKey: string;
};

let cached: GlideAppKit | null = null;

export function getGlideAppKit(): GlideAppKit {
  if (cached) return cached;

  const apiKey = process.env.CIRCLE_API_KEY?.trim();
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET?.trim();
  const kitKey = process.env.CIRCLE_KIT_KEY?.trim();

  if (!apiKey || !entitySecret) {
    throw new Error("Missing CIRCLE_API_KEY or CIRCLE_ENTITY_SECRET");
  }
  if (!kitKey) {
    throw new Error("Missing CIRCLE_KIT_KEY (Arc App Kit key from Circle Console)");
  }

  const adapter = createCircleWalletsAdapter({ apiKey, entitySecret });
  cached = { kit: new AppKit(), adapter, kitKey };
  return cached;
}

export function extractBridgeTx(result: BridgeResult) {
  const steps = result.steps ?? [];
  const withHash = steps.filter((s) => s.txHash);
  const primary = withHash[withHash.length - 1] ?? withHash[0];
  return {
    state: result.state,
    txHash: primary?.txHash,
    explorerUrl: primary?.explorerUrl,
    steps,
  };
}

export async function executeArcSwap(input: {
  walletAddress: string;
  amountIn: string;
}) {
  const { kit, adapter, kitKey } = getGlideAppKit();

  const result = await kit.swap({
    from: { adapter, chain: ArcTestnet, address: input.walletAddress },
    tokenIn: "USDC",
    tokenOut: "EURC",
    amountIn: input.amountIn,
    config: {
      slippageBps: 300,
      kitKey,
    },
  });

  return {
    txHash: result.txHash,
    explorerUrl: result.explorerUrl,
    amountOut: result.amountOut,
    tokenIn: result.tokenIn,
    tokenOut: result.tokenOut,
  };
}

export async function executeArcBridge(input: {
  walletAddress: string;
  amount: string;
  network: BridgeNetworkKey;
}) {
  const dest = BRIDGE_NETWORKS[input.network];
  if (!dest) {
    throw new Error("Unsupported destination network");
  }

  const { kit, adapter } = getGlideAppKit();

  const result = await kit.bridge({
    from: { adapter, chain: ArcTestnet, address: input.walletAddress },
    to: { adapter, chain: dest.chain, address: input.walletAddress },
    amount: input.amount,
    token: "USDC",
  });

  return {
    ...extractBridgeTx(result),
    destination: dest.label,
  };
}
