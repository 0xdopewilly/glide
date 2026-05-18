import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

export const WALLET_SET_NAME = "Glide User Wallets";
export const GLIDE_BLOCKCHAIN = "ARC-TESTNET" as const;

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
