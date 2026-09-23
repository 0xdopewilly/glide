import { createCircleClient } from "@/lib/circle";
import {
  EXTERNAL_CHAINS,
  GLIDE_NETWORK,
  type ExternalChainKey,
  type GlideNetwork,
} from "@/lib/network";
import { createPublicClient, http, parseEther, type Address, type Chain } from "viem";
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

type RefillChainConfig = {
  chain: Chain;
  /** Min native balance a user wallet must hold to attempt a sweep. Below
   * this we top up from the service wallet before letting the bridge fire.
   * `minEth` / `refillEth` are misnomers - the unit is the chain's native
   * token (POL on Polygon, ETH everywhere else), all with 18 decimals so
   * parseEther works uniformly. */
  minEth: string;
  /** How much native token we send per refill. Sized for several sweeps. */
  refillEth: string;
};

/** Per-chain gas refill config. Mainnet values are starting points — tune
 * them from real sweep costs once the service wallets are live. */
const REFILL_BY_CHAIN: Record<
  ExternalChainKey,
  Record<GlideNetwork, RefillChainConfig>
> = {
  base: {
    testnet: { chain: baseSepolia, minEth: "0.00005", refillEth: "0.0005" },
    mainnet: { chain: base, minEth: "0.00005", refillEth: "0.0005" },
  },
  ethereum: {
    /** Ethereum L1 is ~10-50x more expensive than L2s, so larger thresholds. */
    testnet: { chain: sepolia, minEth: "0.0008", refillEth: "0.005" },
    mainnet: { chain: mainnet, minEth: "0.002", refillEth: "0.005" },
  },
  polygon: {
    testnet: { chain: polygonAmoy, minEth: "0.01", refillEth: "0.05" },
    mainnet: { chain: polygon, minEth: "0.05", refillEth: "0.2" },
  },
  arbitrum: {
    /** L2 like Base - tiny gas costs. */
    testnet: { chain: arbitrumSepolia, minEth: "0.00005", refillEth: "0.0005" },
    mainnet: { chain: arbitrum, minEth: "0.00005", refillEth: "0.0005" },
  },
};

/** Env var holding the Glide-operated gas service wallet id for a chain,
 * e.g. GLIDE_GAS_WALLET_BASE_SEPOLIA (testnet) or GLIDE_GAS_WALLET_BASE
 * (mainnet). The wallet is a Circle SCA holding native gas for refills;
 * provision it via /api/admin/gas-wallet and fund it. */
export function gasWalletEnvVar(circleBlockchain: string): string {
  return `GLIDE_GAS_WALLET_${circleBlockchain.replace(/-/g, "_")}`;
}

/** Refill config for the active network, keyed by Circle blockchain id. */
const REFILL_CONFIG: Record<
  string,
  RefillChainConfig & { serviceWalletIdEnv: string }
> = Object.fromEntries(
  (Object.keys(EXTERNAL_CHAINS) as ExternalChainKey[]).map((key) => {
    const circleBlockchain = EXTERNAL_CHAINS[key].circleBlockchain;
    return [
      circleBlockchain,
      {
        ...REFILL_BY_CHAIN[key][GLIDE_NETWORK],
        serviceWalletIdEnv: gasWalletEnvVar(circleBlockchain),
      },
    ];
  }),
);

function isSupportedChain(chain: string): boolean {
  return chain in REFILL_CONFIG;
}

async function readNativeBalance(chain: Chain, address: Address): Promise<bigint> {
  const client = createPublicClient({ chain, transport: http() });
  return client.getBalance({ address });
}

/** Polls Circle for a transaction id until it confirms or we time out.
 * Returns whether the refill is on-chain. */
async function waitForCircleTx(txId: string, timeoutMs = 30_000): Promise<boolean> {
  const initialized = createCircleClient();
  if ("error" in initialized) return false;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await initialized.client.getTransaction({ id: txId });
      const state = res.data?.transaction?.state;
      // Circle DCW states (SDK order): INITIATED -> CLEARED -> QUEUED ->
      // SENT -> CONFIRMED -> COMPLETE. CLEARED is pre-chain, so the gas is
      // only usable once CONFIRMED. FAILED / DENIED / CANCELLED / STUCK are
      // terminal failures — stop waiting instead of burning the timeout.
      if (state === "CONFIRMED" || state === "COMPLETE") return true;
      if (
        state === "FAILED" ||
        state === "DENIED" ||
        state === "CANCELLED" ||
        state === "STUCK"
      ) {
        return false;
      }
    } catch {
      // transient - retry
    }
    await new Promise((r) => setTimeout(r, 2_000));
  }
  return false;
}

/** Ensure the user's wallet on `circleBlockchain` has enough native gas for a
 * sweep. If short, transfers `refillEth` from the Glide service wallet and
 * waits for confirmation. Throws if no service wallet is configured or if the
 * refill doesn't land in time. */
export async function ensureSourceGas(input: {
  circleBlockchain: string;
  userWalletAddress: string;
}): Promise<{ refilled: boolean; reason?: string }> {
  if (!isSupportedChain(input.circleBlockchain)) {
    return { refilled: false, reason: "chain not configured for gas refill" };
  }

  const config = REFILL_CONFIG[input.circleBlockchain];
  const serviceWalletId = process.env[config.serviceWalletIdEnv]?.trim();
  if (!serviceWalletId) {
    throw new Error(
      `Missing ${config.serviceWalletIdEnv} - provision a Glide gas wallet on ${input.circleBlockchain} and set the env var.`,
    );
  }

  const userAddress = input.userWalletAddress as Address;
  const balance = await readNativeBalance(config.chain, userAddress);
  const minWei = parseEther(config.minEth);
  if (balance >= minWei) {
    return { refilled: false, reason: "already sufficient" };
  }

  const initialized = createCircleClient();
  if ("error" in initialized) {
    throw new Error(initialized.error);
  }

  // Circle DCW createTransaction needs an explicit tokenId, not an empty
  // tokenAddress. Look up the service wallet's native-chain-token id.
  const balances = await initialized.client.getWalletTokenBalance({
    id: serviceWalletId,
  });
  const native = balances.data?.tokenBalances?.find((b) => {
    const addr = b.token?.tokenAddress;
    return !addr || addr === "";
  });
  const nativeTokenId = native?.token?.id;
  if (!nativeTokenId) {
    throw new Error(
      `Could not resolve native token id for service wallet ${serviceWalletId}. Fund the service wallet first.`,
    );
  }

  const transfer = await initialized.client.createTransaction({
    walletId: serviceWalletId,
    destinationAddress: input.userWalletAddress,
    amount: [config.refillEth],
    tokenId: nativeTokenId,
    fee: {
      type: "level",
      config: { feeLevel: "MEDIUM" },
    },
  });

  const txId = transfer.data?.id;
  if (!txId) {
    throw new Error("Gas refill transfer did not return a transaction id");
  }

  const confirmed = await waitForCircleTx(txId);
  if (!confirmed) {
    throw new Error(
      `Gas refill ${txId} did not confirm in time. Check Circle Console.`,
    );
  }
  return { refilled: true };
}
