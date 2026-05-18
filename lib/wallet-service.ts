import {
  createCircleClient,
  getOrCreateWalletSetId,
  GLIDE_BLOCKCHAIN,
  safeApiError,
} from "@/lib/circle";
import type { GlideWallet } from "@/lib/types";

export async function createGlideWallet(): Promise<GlideWallet> {
  const initialized = createCircleClient();
  if ("error" in initialized) throw new Error(initialized.error);

  const { client } = initialized;
  const walletSetId = await getOrCreateWalletSetId(client);

  const walletsResponse = await client.createWallets({
    walletSetId,
    blockchains: [GLIDE_BLOCKCHAIN],
    count: 1,
    accountType: "SCA",
  });

  const wallet = walletsResponse.data?.wallets?.[0];
  if (!wallet?.id || !wallet?.address) {
    throw new Error("Wallet creation incomplete");
  }

  return { id: wallet.id, address: wallet.address };
}

export async function fetchWalletBalance(walletId: string): Promise<number> {
  const initialized = createCircleClient();
  if ("error" in initialized) return 0;

  try {
    const balances = await initialized.client.getWalletTokenBalance({
      id: walletId,
    });
    const tokenBalances = balances.data?.tokenBalances ?? [];
    let total = 0;
    for (const entry of tokenBalances) {
      const amount = parseFloat(entry.amount ?? "0");
      if (!Number.isNaN(amount)) total += amount;
    }
    return total;
  } catch {
    return 0;
  }
}

export async function fetchWalletById(walletId: string): Promise<GlideWallet | null> {
  const initialized = createCircleClient();
  if ("error" in initialized) return null;

  try {
    const res = await initialized.client.getWallet({ id: walletId });
    const w = res.data?.wallet;
    if (!w?.id || !w?.address) return null;
    return { id: w.id, address: w.address };
  } catch {
    return null;
  }
}

export { safeApiError };
