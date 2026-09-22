import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import {
  ARC_NETWORK,
  EXTERNAL_CHAINS,
  type ExternalChainKey,
} from "@/lib/network";

export const WALLET_SET_NAME = "Glide User Wallets";
export const GLIDE_BLOCKCHAIN = ARC_NETWORK.circleBlockchain;

/** Chains we provision receive-wallets on for Universal Receive (CCTP V2 sweep
 * into Arc). Arc itself stays on User.circleWalletId — these are *additional*
 * source chains a sender can pay USDC to. Circle ids follow GLIDE_NETWORK. */
export const RECEIVE_CHAINS = EXTERNAL_CHAINS;

export type ReceiveChainKey = ExternalChainKey;

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

export type CircleTokenInfo = {
  blockchain?: string;
  tokenAddress?: string;
  isNative?: boolean;
};

const tokenInfoCache = new Map<string, CircleTokenInfo>();

/** Resolve a Circle token id to its chain + contract. Token metadata is
 * static, so successful lookups are cached for the life of the instance.
 * Throws on API errors so callers can decide (and nothing bad gets cached). */
export async function resolveCircleToken(
  tokenId: string,
): Promise<CircleTokenInfo | null> {
  const cached = tokenInfoCache.get(tokenId);
  if (cached) return cached;

  const initialized = createCircleClient();
  if ("error" in initialized) throw new Error(initialized.error);

  const res = await initialized.client.getToken({ id: tokenId });
  const token = res.data?.token;
  if (!token) return null;
  const info: CircleTokenInfo = {
    blockchain: token.blockchain,
    tokenAddress: token.tokenAddress,
    isNative: token.isNative,
  };
  tokenInfoCache.set(tokenId, info);
  return info;
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
