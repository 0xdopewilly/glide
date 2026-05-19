import type { BridgeNetworkKey } from "@/lib/app-kit";
import { BRIDGE_KEY_TO_CHAIN, CHAIN_META, type GlideChainKey } from "@/lib/chain-meta";
import type { GlideTokenBalance } from "@/lib/types";
import {
  createPublicClient,
  erc20Abi,
  formatUnits,
  http,
  type Address,
  type Chain,
} from "viem";
import {
  arbitrumSepolia,
  baseSepolia,
  polygonAmoy,
  sepolia,
} from "viem/chains";

const MIN_DISPLAY = 0.000_001;

const SEPOLIA_USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as Address;
const BASE_SEPOLIA_USDC = "0x036CbD53842c542663c92897219773B176dbeBd7" as Address;
const ARBITRUM_SEPOLIA_USDC = "0x75faf114eafb1BDbe2F631b3Ed6285af582bd807" as Address;
const POLYGON_AMOY_USDC = "0x41E94Eb017C8aF78c5aC8a01bCbe1F3226D56C35" as Address;

const OFF_ARC: {
  network: BridgeNetworkKey;
  chainId: GlideChainKey;
  chain: Chain;
  usdc: Address;
}[] = [
  {
    network: "ethereum",
    chainId: BRIDGE_KEY_TO_CHAIN.ethereum,
    chain: sepolia,
    usdc: SEPOLIA_USDC,
  },
  {
    network: "base",
    chainId: BRIDGE_KEY_TO_CHAIN.base,
    chain: baseSepolia,
    usdc: BASE_SEPOLIA_USDC,
  },
  {
    network: "polygon",
    chainId: BRIDGE_KEY_TO_CHAIN.polygon,
    chain: polygonAmoy,
    usdc: POLYGON_AMOY_USDC,
  },
  {
    network: "arbitrum",
    chainId: BRIDGE_KEY_TO_CHAIN.arbitrum,
    chain: arbitrumSepolia,
    usdc: ARBITRUM_SEPOLIA_USDC,
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
  const out: GlideTokenBalance[] = [];

  for (const { chainId, network, chain, usdc } of OFF_ARC) {
    try {
      const amount = await readUsdcOnChain(chain, usdc, wallet);
      if (amount < MIN_DISPLAY) continue;
      out.push({
        symbol: "USDC",
        amount,
        usdValue: amount,
        chainId,
        chainLabel: CHAIN_META[chainId].label,
      });
    } catch (err) {
      console.warn(`[Glide] ${chainId} USDC balance:`, err);
    }
  }

  return out;
}
