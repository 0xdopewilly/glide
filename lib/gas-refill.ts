import { createCircleClient } from "@/lib/circle";
import {
  EXTERNAL_CHAINS,
  GLIDE_NETWORK,
  type ExternalChainKey,
  type GlideNetwork,
} from "@/lib/network";
import type { Blockchain } from "@circle-fin/developer-controlled-wallets";
import {
  createPublicClient,
  formatEther,
  http,
  parseEther,
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

/** Env var that can pin a chain's gas service wallet id, e.g.
 * GLIDE_GAS_WALLET_BASE_SEPOLIA (testnet setups). Optional: without it the
 * wallet is found by its Circle refId (gasWalletRefId). */
function gasWalletEnvVar(circleBlockchain: string): string {
  return `GLIDE_GAS_WALLET_${circleBlockchain.replace(/-/g, "_")}`;
}

/** Circle refId that marks a wallet as glidepay's gas service wallet for a
 * chain. The Operations screen tags the wallets it creates with it, so a new
 * gas wallet is picked up without an env var or a redeploy. */
export function gasWalletRefId(circleBlockchain: string): string {
  return `glidepay-gas-${circleBlockchain}`;
}

/** A chain counts as ready once its gas wallet holds this many refills (one
 * refill plus headroom for the wallet's own transfer fee). */
const READY_REFILLS = BigInt(2);

/** Suggested funding: enough for about this many first-time sweeps. */
const SUGGESTED_REFILLS = BigInt(10);

/** Refill config for the active network, keyed by Circle blockchain id. */
const REFILL_CONFIG: Record<string, RefillChainConfig> = Object.fromEntries(
  (Object.keys(EXTERNAL_CHAINS) as ExternalChainKey[]).map((key) => [
    EXTERNAL_CHAINS[key].circleBlockchain,
    REFILL_BY_CHAIN[key][GLIDE_NETWORK],
  ]),
);

function isSupportedChain(chain: string): boolean {
  return chain in REFILL_CONFIG;
}

async function readNativeBalance(chain: Chain, address: Address): Promise<bigint> {
  const client = createPublicClient({ chain, transport: http() });
  return client.getBalance({ address });
}

type GasWallet = { id: string; address: string };

const walletCache = new Map<string, { value: GasWallet | null; at: number }>();
const readyCache = new Map<string, { value: boolean; at: number }>();
const FOUND_TTL_MS = 10 * 60_000;
const MISSING_TTL_MS = 60_000;
const READY_TTL_MS = 60_000;

/** The chain's gas service wallet: the env var id when one is set, else the
 * Circle wallet tagged with gasWalletRefId. Cached per instance. */
export async function resolveGasWallet(
  circleBlockchain: string,
): Promise<GasWallet | null> {
  const hit = walletCache.get(circleBlockchain);
  if (hit && Date.now() - hit.at < (hit.value ? FOUND_TTL_MS : MISSING_TTL_MS)) {
    return hit.value;
  }
  const initialized = createCircleClient();
  if ("error" in initialized) return null;
  const { client } = initialized;

  let value: GasWallet | null = null;
  const envId = process.env[gasWalletEnvVar(circleBlockchain)]?.trim();
  if (envId) {
    const w = (await client.getWallet({ id: envId })).data?.wallet;
    if (w?.id && w.address) value = { id: w.id, address: w.address };
  } else {
    const wallets =
      (
        await client.listWallets({
          refId: gasWalletRefId(circleBlockchain),
          blockchain: circleBlockchain as Blockchain,
        })
      ).data?.wallets ?? [];
    const w = wallets.find((x) => x.state === "LIVE") ?? wallets[0];
    if (w?.id && w.address) value = { id: w.id, address: w.address };
  }
  walletCache.set(circleBlockchain, { value, at: Date.now() });
  return value;
}

/** Drop the cached lookup, e.g. right after the Operations screen creates a
 * gas wallet. */
export function forgetGasWallet(circleBlockchain: string): void {
  walletCache.delete(circleBlockchain);
  readyCache.delete(circleBlockchain);
}

/** Whether Universal Receive can run on the chain: its gas wallet exists and
 * holds enough native gas for a refill. Without that a deposit can't be
 * bridged to Arc (the bridge needs native gas in the user's source wallet)
 * and would sit on the source chain, so Receive doesn't offer the chain.
 * A drained gas wallet takes its chain offline by itself. Cached briefly. */
export async function gasWalletReady(circleBlockchain: string): Promise<boolean> {
  if (!isSupportedChain(circleBlockchain)) return false;
  const hit = readyCache.get(circleBlockchain);
  if (hit && Date.now() - hit.at < READY_TTL_MS) return hit.value;
  let value = false;
  try {
    const wallet = await resolveGasWallet(circleBlockchain);
    if (wallet) {
      const config = REFILL_CONFIG[circleBlockchain];
      const balance = await readNativeBalance(config.chain, wallet.address as Address);
      value = balance >= parseEther(config.refillEth) * READY_REFILLS;
    }
  } catch (err) {
    console.warn("[Glide] gas wallet check:", circleBlockchain, err);
  }
  readyCache.set(circleBlockchain, { value, at: Date.now() });
  return value;
}

export type GasWalletStatus = {
  circleBlockchain: string;
  /** Native gas token, e.g. "ETH" or "POL". */
  symbol: string;
  walletId: string | null;
  address: string | null;
  /** Current native balance, in whole tokens ("0.0042"). Null if unknown. */
  balance: string | null;
  /** Amount sent to a user's wallet before a sweep. */
  refill: string;
  /** Balance at which the chain goes live. */
  readyAt: string;
  /** Suggested funding (about SUGGESTED_REFILLS sweeps). */
  suggested: string;
  ready: boolean;
};

/** Fresh (uncached) status of a chain's gas wallet, for the Operations
 * screen. */
export async function describeGasWallet(
  circleBlockchain: string,
): Promise<GasWalletStatus> {
  const config = REFILL_CONFIG[circleBlockchain];
  const refill = parseEther(config.refillEth);
  forgetGasWallet(circleBlockchain);
  const wallet = await resolveGasWallet(circleBlockchain);
  let balance: bigint | null = null;
  if (wallet) {
    balance = await readNativeBalance(config.chain, wallet.address as Address).catch(
      () => null,
    );
  }
  const ready = balance !== null && balance >= refill * READY_REFILLS;
  readyCache.set(circleBlockchain, { value: ready, at: Date.now() });
  return {
    circleBlockchain,
    symbol: config.chain.nativeCurrency.symbol,
    walletId: wallet?.id ?? null,
    address: wallet?.address ?? null,
    balance: balance === null ? null : formatEther(balance),
    refill: config.refillEth,
    readyAt: formatEther(refill * READY_REFILLS),
    suggested: formatEther(refill * SUGGESTED_REFILLS),
    ready,
  };
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
  const serviceWallet = await resolveGasWallet(input.circleBlockchain);
  if (!serviceWallet) {
    throw new Error(
      `No gas wallet on ${input.circleBlockchain} - create one in Profile → Operations and fund it.`,
    );
  }
  const serviceWalletId = serviceWallet.id;

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
