import { BRIDGE_KEY_TO_CHAIN, CHAIN_META, type GlideChainKey } from "@/lib/chain-meta";
import { IS_MAINNET, type ExternalChainKey } from "@/lib/network";
import type { GlideTokenBalance } from "@/lib/types";
import {
  Arbitrum as KitArbitrum,
  ArbitrumSepolia as KitArbitrumSepolia,
  Base as KitBase,
  BaseSepolia as KitBaseSepolia,
  Ethereum as KitEthereum,
  EthereumSepolia as KitEthereumSepolia,
  Polygon as KitPolygon,
  PolygonAmoy as KitPolygonAmoy,
} from "@circle-fin/app-kit/chains";
import {
  createPublicClient,
  erc20Abi,
  formatUnits,
  http,
  type Address,
  type Chain,
} from "viem";
import {
  arbitrum,
  arbitrumSepolia,
  base,
  baseSepolia,
  mainnet,
  polygon,
  polygonAmoy,
  sepolia,
} from "viem/chains";

const MIN_DISPLAY = 0.000_001;

/** Circle's App Kit chain definitions for each external chain on the active
 * network — the source of truth for USDC contract addresses, so they can't
 * drift from what the bridge uses. */
const KIT_CHAIN: Record<ExternalChainKey, { usdcAddress: string }> = {
  ethereum: IS_MAINNET ? KitEthereum : KitEthereumSepolia,
  base: IS_MAINNET ? KitBase : KitBaseSepolia,
  polygon: IS_MAINNET ? KitPolygon : KitPolygonAmoy,
  arbitrum: IS_MAINNET ? KitArbitrum : KitArbitrumSepolia,
};

/** USDC contract on an external chain (active network). */
export function externalUsdcAddress(key: ExternalChainKey): string {
  return KIT_CHAIN[key].usdcAddress;
}

const OFF_ARC: {
  chainId: GlideChainKey;
  chain: Chain;
  usdc: Address;
}[] = [
  {
    chainId: BRIDGE_KEY_TO_CHAIN.ethereum,
    chain: IS_MAINNET ? mainnet : sepolia,
    usdc: externalUsdcAddress("ethereum") as Address,
  },
  {
    chainId: BRIDGE_KEY_TO_CHAIN.base,
    chain: IS_MAINNET ? base : baseSepolia,
    usdc: externalUsdcAddress("base") as Address,
  },
  {
    chainId: BRIDGE_KEY_TO_CHAIN.polygon,
    chain: IS_MAINNET ? polygon : polygonAmoy,
    usdc: externalUsdcAddress("polygon") as Address,
  },
  {
    chainId: BRIDGE_KEY_TO_CHAIN.arbitrum,
    chain: IS_MAINNET ? arbitrum : arbitrumSepolia,
    usdc: externalUsdcAddress("arbitrum") as Address,
  },
];

async function readUsdcOnChain(
  chain: Chain,
  token: Address,
  wallet: Address,
): Promise<number> {
  const client = createPublicClient({ chain, transport: http() });
  const raw = await client.readContract({
    address: token,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [wallet],
  });
  return parseFloat(formatUnits(raw, 6));
}

/** USDC on bridge destination chains (same smart-account address). */
export async function fetchOffArcUsdcBalances(
  walletAddress: string,
): Promise<GlideTokenBalance[]> {
  if (!walletAddress?.startsWith("0x")) return [];

  const wallet = walletAddress as Address;

  const rows = await Promise.all(
    OFF_ARC.map(async ({ chainId, chain, usdc }) => {
      try {
        const amount = await readUsdcOnChain(chain, usdc, wallet);
        if (amount < MIN_DISPLAY) return null;
        return {
          symbol: "USDC",
          amount,
          usdValue: amount,
          chainId,
          chainLabel: CHAIN_META[chainId].label,
        } satisfies GlideTokenBalance;
      } catch (err) {
        console.warn(`[Glide] ${chainId} USDC balance:`, err);
        return null;
      }
    }),
  );

  return rows.filter((r): r is GlideTokenBalance => r !== null);
}
