import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

export const WALLET_SET_NAME = "Glide User Wallets";
export const GLIDE_BLOCKCHAIN = "ARC-TESTNET" as const;

/** Chains we provision receive-wallets on for Universal Receive (CCTP V2 sweep
 * into Arc). Arc itself stays on User.circleWalletId — these are *additional*
 * source chains a sender can pay USDC to. */
export const RECEIVE_CHAINS = {
  base: { circleBlockchain: "BASE-SEPOLIA", label: "Base" },
  ethereum: { circleBlockchain: "ETH-SEPOLIA", label: "Ethereum" },
} as const;

export type ReceiveChainKey = keyof typeof RECEIVE_CHAINS;
export type ReceiveCircleBlockchain =
  (typeof RECEIVE_CHAINS)[ReceiveChainKey]["circleBlockchain"];

export function getReceiveChainByCircleBlockchain(
  circleBlockchain: string,
): ReceiveChainKey | null {
  for (const [key, def] of Object.entries(RECEIVE_CHAINS)) {
    if (def.circleBlockchain === circleBlockchain) {
      return key as ReceiveChainKey;
    }
  }
  return null;
}

export function createCircleClient() {
  const apiKey = process.env.CIRCLE_API_KEY?.trim();
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET?.trim();

  if (!apiKey || !entitySecret) {
    return { error: "Missing CIRCLE_API_KEY or CIRCLE_ENTITY_SECRET" as const };
  }

  return {
    client: initiateDeveloperControlledWalletsClient({
      apiKey,
      entitySecret,
    }),
  };
}

export async function getOrCreateWalletSetId(
  client: ReturnType<typeof initiateDeveloperControlledWalletsClient>,
) {
  const fromEnv = process.env.CIRCLE_WALLET_SET_ID?.trim();
  if (fromEnv) return fromEnv;

  const listed = await client.listWalletSets({ pageSize: 50 });
  const existing = listed.data?.walletSets?.[0];
  if (existing?.id) return existing.id;

  const created = await client.createWalletSet({ name: WALLET_SET_NAME });
  const id = created.data?.walletSet?.id;
  if (!id) throw new Error("Could not create wallet set");
  return id;
}

export function safeApiError(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message?: string }).message;
    if (typeof msg === "string" && msg.length > 0) {
      return msg.length > 200 ? `${msg.slice(0, 200)}…` : msg;
    }
  }
  return "Something went wrong. Please try again.";
}
