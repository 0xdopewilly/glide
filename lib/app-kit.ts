import { createCircleWalletsAdapter } from "@circle-fin/adapter-circle-wallets";
import { AppKit, type BridgeResult } from "@circle-fin/app-kit";
import { kitKeyStatus, resolveKitKey } from "@/lib/kit-key";
import { EXTERNAL_CHAINS, IS_MAINNET, type ExternalChainKey } from "@/lib/network";
import {
  Arc,
  ArcTestnet,
  Arbitrum,
  ArbitrumSepolia,
  Base,
  BaseSepolia,
  Ethereum,
  EthereumSepolia,
  Polygon,
  PolygonAmoy,
} from "@circle-fin/app-kit/chains";

/** App Kit chain definition for Arc on the active network. */
export const ARC_KIT_CHAIN = IS_MAINNET ? Arc : ArcTestnet;

export const BRIDGE_NETWORKS = {
  ethereum: { chain: IS_MAINNET ? Ethereum : EthereumSepolia, label: "Ethereum" },
  base: { chain: IS_MAINNET ? Base : BaseSepolia, label: "Base" },
  polygon: { chain: IS_MAINNET ? Polygon : PolygonAmoy, label: "Polygon" },
  arbitrum: { chain: IS_MAINNET ? Arbitrum : ArbitrumSepolia, label: "Arbitrum" },
} as const;

export type BridgeNetworkKey = ExternalChainKey;

/** Maps Glide's BridgeNetworkKey to Circle's blockchain identifier. Shared by
 * both inbound sweeps (cctp-receive) and outbound bridges (executeArcBridge)
 * so gas-refill targets stay in sync across directions. */
export const BRIDGE_TO_CIRCLE_BLOCKCHAIN: Record<BridgeNetworkKey, string> = {
  base: EXTERNAL_CHAINS.base.circleBlockchain,
  ethereum: EXTERNAL_CHAINS.ethereum.circleBlockchain,
  polygon: EXTERNAL_CHAINS.polygon.circleBlockchain,
  arbitrum: EXTERNAL_CHAINS.arbitrum.circleBlockchain,
};

type GlideAppKit = {
  kit: AppKit;
  adapter: ReturnType<typeof createCircleWalletsAdapter>;
  /** Optional since App Kit 1.15 — swaps accept the Circle API key. Passed
   * through when CIRCLE_KIT_KEY is set so existing deployments keep using it. */
  kitKey?: string;
};

let cached: GlideAppKit | null = null;

export function getGlideAppKit(): GlideAppKit {
  if (cached) return cached;

  const apiKey = process.env.CIRCLE_API_KEY?.trim();
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET?.trim();
  const kitKey = kitKeyStatus().source !== "none" ? resolveKitKey() : undefined;

  if (!apiKey || !entitySecret) {
    throw new Error("Missing CIRCLE_API_KEY or CIRCLE_ENTITY_SECRET");
  }

  // One Circle Wallets adapter serves swaps and both sides of every bridge
  // (developer-controlled SCAs, signed server-side).
  const adapter = createCircleWalletsAdapter({ apiKey, entitySecret });
  cached = { kit: new AppKit(), adapter, kitKey };
  return cached;
}

const SECRET_KEYS = new Set(["apiKey", "kitKey", "entitySecret"]);

/** JSON-safe copy for the DB (bigints stringified, credential-like keys
 * dropped defensively — BridgeResult carries none today). */
function toJsonSafe(value: unknown): unknown {
  try {
    return JSON.parse(
      JSON.stringify(value, (key, v) =>
        SECRET_KEYS.has(key) ? undefined : typeof v === "bigint" ? v.toString() : v,
      ),
    );
  } catch {
    return null;
  }
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
    // Once the burn lands the USDC has left the source chain: a later error
    // means it's in transit (resumable via kit.retry), not "not moved".
    burned: steps.some(
      (s) => s.name.toLowerCase() === "burn" && s.state === "success",
    ),
    // Full result, persisted so a stuck transfer can be resumed later with
    // kit.retry(result, ...).
    snapshot: toJsonSafe(result),
  };
}

export async function estimateArcSwap(input: {
  walletAddress: string;
  amountIn: string;
  tokenIn?: "USDC" | "EURC" | "cirBTC";
  tokenOut?: "USDC" | "EURC" | "cirBTC";
}) {
  const { kit, adapter, kitKey } = getGlideAppKit();
  const tokenIn = input.tokenIn ?? "USDC";
  const tokenOut = input.tokenOut ?? "EURC";

  const estimate = await kit.estimateSwap({
    from: { adapter, chain: ARC_KIT_CHAIN, address: input.walletAddress },
    tokenIn,
    tokenOut,
    amountIn: input.amountIn,
    config: { kitKey, slippageBps: 300 },
  });

  return {
    amountOut: estimate.estimatedOutput?.amount,
    tokenOut: estimate.estimatedOutput?.token,
  };
}

export async function estimateArcBridge(input: {
  walletAddress: string;
  amount: string;
  network: BridgeNetworkKey;
  recipientAddress?: string;
}) {
  const dest = BRIDGE_NETWORKS[input.network];
  if (!dest) throw new Error("Unsupported destination network");

  const { kit, adapter: bridgeAdapter } = getGlideAppKit();
  // Same forwarder route as executeArcBridge; the recipient doesn't affect
  // fees, so the user's own address stands in until they enter one.
  const estimate = await kit.estimateBridge({
    from: { adapter: bridgeAdapter, chain: ARC_KIT_CHAIN, address: input.walletAddress },
    to: {
      chain: dest.chain,
      recipientAddress: input.recipientAddress ?? input.walletAddress,
      useForwarder: true,
    },
    amount: input.amount,
    token: "USDC",
  });

  return {
    fees: estimate.fees,
    destination: dest.label,
  };
}

export async function executeArcSwap(input: {
  walletAddress: string;
  amountIn: string;
  tokenIn?: "USDC" | "EURC" | "cirBTC";
  tokenOut?: "USDC" | "EURC" | "cirBTC";
}) {
  const { kit, adapter, kitKey } = getGlideAppKit();
  const tokenIn = input.tokenIn ?? "USDC";
  const tokenOut = input.tokenOut ?? "EURC";

  try {
    const result = await kit.swap({
      from: { adapter, chain: ARC_KIT_CHAIN, address: input.walletAddress },
      tokenIn,
      tokenOut,
      amountIn: input.amountIn,
      config: {
        slippageBps: 300,
        kitKey,
        // Circle SCAs may be undeployed until first tx - permit fails; approve works.
        allowanceStrategy: "approve",
      },
    });

    if (!result.txHash) {
      throw new Error(
        "Swap did not return a transaction. Check CIRCLE_KIT_KEY and Arc App Kit access in Circle Console.",
      );
    }

    // Same-chain swaps settle atomically and are confirmed (and checked for
    // revert) before swap() returns; PENDING only means amountOut wasn't
    // enriched yet. FAILED is still treated as a failure, defensively.
    if (result.progress?.status === "FAILED") {
      throw new Error("Swap could not be completed. Your funds were not moved.");
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
      err instanceof Error ? err.message : "Swap failed on Arc";
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
        throw new Error(status.hint ?? "Swap unavailable - kit key not configured.");
      }
      throw new Error(
        "Circle rejected your Kit Key (wrong project or revoked). In Circle Console, create a new Kit Key under the same app as CIRCLE_API_KEY, update CIRCLE_KIT_KEY on Vercel, redeploy, then check /api/health/kit.",
      );
    }
    throw new Error(message.length < 200 ? message : "Swap could not be completed. Try again.");
  }
}

/** Universal Receive: bridge USDC from an external chain back to Arc.
 *
 * This is the *inbound* direction (opposite of executeArcBridge). Triggered
 * when a Circle webhook fires on inbound USDC at the user's per-chain receive
 * address. Uses CCTP V2 Fast Transfer (default) so the sweep lands on Arc in
 * <60s. The mint recipient is the user's *existing* Arc wallet address — note
 * that Circle SCAs do NOT share addresses across EVM chains, so source and
 * destination addresses are distinct. */
export async function sweepIncomingToArc(input: {
  sourceNetwork: BridgeNetworkKey;
  sourceAddress: string;
  destinationAddress: string;
  amount: string;
}) {
  const source = BRIDGE_NETWORKS[input.sourceNetwork];
  if (!source) throw new Error("Unsupported source network");

  const { kit, adapter: bridgeAdapter } = getGlideAppKit();

  const result = await kit.bridge({
    from: {
      adapter: bridgeAdapter,
      chain: source.chain,
      address: input.sourceAddress,
    },
    to: {
      adapter: bridgeAdapter,
      chain: ARC_KIT_CHAIN,
      address: input.destinationAddress,
    },
    amount: input.amount,
    token: "USDC",
    config: { batchTransactions: false },
  });

  return {
    ...extractBridgeTx(result),
    sourceLabel: source.label,
  };
}

/** Outbound bridge: USDC from the user's Arc wallet to any address on the
 * destination chain. Circle's Forwarding Service mints on the destination
 * (relay fee taken from the amount that arrives), so the recipient needs no
 * glidepay wallet and nobody needs destination-chain gas. */
export async function executeArcBridge(input: {
  walletAddress: string;
  amount: string;
  network: BridgeNetworkKey;
  recipientAddress: string;
}) {
  const dest = BRIDGE_NETWORKS[input.network];
  if (!dest) {
    throw new Error("Unsupported destination network");
  }

  const { kit, adapter: bridgeAdapter } = getGlideAppKit();

  try {
    const result = await kit.bridge({
      from: {
        adapter: bridgeAdapter,
        chain: ARC_KIT_CHAIN,
        address: input.walletAddress,
      },
      to: {
        chain: dest.chain,
        recipientAddress: input.recipientAddress,
        useForwarder: true,
      },
      amount: input.amount,
      token: "USDC",
      config: {
        batchTransactions: false,
      },
    });

    return {
      ...extractBridgeTx(result),
      destination: dest.label,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Bridge failed on Arc";
    if (message.includes("CIRCLE_KIT_KEY") || message.includes("Missing")) {
      throw err;
    }
    // Gas-fee check must run BEFORE the generic "insufficient/balance"
    // catch: the SDK's destination-gas error is "Insufficient <native>
    // on <chain> to cover gas fees", which would otherwise match the
    // generic case and re-throw the raw message.
    if (
      message.toLowerCase().includes("cover gas fees") ||
      message.toLowerCase().includes("pay for gas") ||
      message.toLowerCase().includes("native balance") ||
      message.includes("156001") ||
      message.toLowerCase().includes("unknown rpc")
    ) {
      throw new Error(
        "We weren't able to fund gas for this bridge. Try again in a moment, or contact support if it persists.",
      );
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
        throw new Error(status.hint ?? "Bridge unavailable - check Circle API credentials.");
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
