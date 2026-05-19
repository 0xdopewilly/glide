import { createCircleWalletsAdapter } from "@circle-fin/adapter-circle-wallets";
import { AppKit } from "@circle-fin/app-kit";
import { kitKeyStatus, resolveKitKey } from "@/lib/kit-key";
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
  const kitKey = resolveKitKey();

  if (!apiKey || !entitySecret) {
    throw new Error("Missing CIRCLE_API_KEY or CIRCLE_ENTITY_SECRET");
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

  try {
    const result = await kit.swap({
      from: { adapter, chain: ArcTestnet, address: input.walletAddress },
      tokenIn: "USDC",
      tokenOut: "EURC",
      amountIn: input.amountIn,
      config: {
        slippageBps: 300,
        kitKey,
        // Circle SCAs may be undeployed until first tx — permit fails; approve works.
        allowanceStrategy: "approve",
      },
    });

    if (!result.txHash) {
      throw new Error(
        "Swap did not return a transaction. Check CIRCLE_KIT_KEY and Arc App Kit access in Circle Console.",
      );
    }

    return {
      txHash: result.txHash,
      explorerUrl: result.explorerUrl,
      amountOut: result.amountOut,
      tokenIn: result.tokenIn,
      tokenOut: result.tokenOut,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Swap failed on Arc testnet";
    if (message.includes("CIRCLE_KIT_KEY") || message.includes("Missing")) {
      throw err;
    }
    if (
      message.toLowerCase().includes("insufficient") ||
      message.toLowerCase().includes("balance")
    ) {
      throw new Error(message);
    }
    if (
      message.toLowerCase().includes("api key") ||
      message.toLowerCase().includes("authorization") ||
      message.includes("401") ||
      message.includes("403")
    ) {
      const status = kitKeyStatus();
      if (!status.ok) {
        throw new Error(status.hint ?? "Swap unavailable — kit key not configured.");
      }
      throw new Error(
        "Circle rejected your Kit Key (wrong project or revoked). In Circle Console, create a new Kit Key under the same app as CIRCLE_API_KEY, update CIRCLE_KIT_KEY on Vercel, redeploy, then check /api/health/kit.",
      );
    }
    throw new Error(message.length < 200 ? message : "Swap could not be completed. Try again.");
  }
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

  try {
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
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Bridge failed on Arc testnet";
    if (message.includes("CIRCLE_KIT_KEY") || message.includes("Missing")) {
      throw err;
    }
    if (
      message.toLowerCase().includes("insufficient") ||
      message.toLowerCase().includes("balance")
    ) {
      throw new Error(message);
    }
    if (
      message.toLowerCase().includes("undeployed") ||
      message.toLowerCase().includes("permit")
    ) {
      throw new Error(
        "Your wallet needs a small on-chain transaction first. Try sending USDC once, then bridge again.",
      );
    }
    if (
      message.toLowerCase().includes("api key") ||
      message.toLowerCase().includes("authorization") ||
      message.includes("401") ||
      message.includes("403")
    ) {
      const status = kitKeyStatus();
      if (!status.ok) {
        throw new Error(status.hint ?? "Bridge unavailable — check Circle API credentials.");
      }
      if (!status.circleApiKeySet || !status.circleEntitySecretSet) {
        throw new Error(
          "Missing CIRCLE_API_KEY or CIRCLE_ENTITY_SECRET on the server. Add them on Vercel and redeploy.",
        );
      }
      throw new Error(
        "Circle rejected the request. Confirm CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET match your wallet app in Circle Console, then redeploy.",
      );
    }
    throw new Error(message.length < 200 ? message : "Bridge could not be completed. Try again.");
  }
}
