import { createCircleClient } from "@/lib/circle";
import { createPublicClient, http, parseEther, type Address, type Chain } from "viem";
import { baseSepolia } from "viem/chains";

/** Chain-specific gas refill config. Add new chains alongside RECEIVE_CHAINS. */
const REFILL_CONFIG = {
  "BASE-SEPOLIA": {
    chain: baseSepolia,
    /** Glide-operated SCA wallet on this chain, holds native ETH for refills.
     * Provision once via Circle Console + fund via faucet. */
    serviceWalletIdEnv: "GLIDE_GAS_WALLET_BASE_SEPOLIA",
    /** Min ETH a user wallet must hold to attempt a sweep. Below this we
     * top up from the service wallet before letting the bridge fire. */
    minEth: "0.00005",
    /** How much ETH we send per refill. Sized for several sweeps. */
    refillEth: "0.0005",
  },
} as const;

type CircleBlockchain = keyof typeof REFILL_CONFIG;

function isSupportedChain(chain: string): chain is CircleBlockchain {
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
      // Circle DCW lifecycle: INITIATED -> QUEUED -> SENT -> CLEARED (success).
      // STUCK / CANCELLED are terminal failures.
      if (state === "CLEARED") return true;
      if (state === "CANCELLED" || state === "STUCK") return false;
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
