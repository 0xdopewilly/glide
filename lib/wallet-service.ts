import {
  createCircleClient,
  getOrCreateWalletSetId,
  GLIDE_BLOCKCHAIN,
  safeApiError,
} from "@/lib/circle";
import { isUsdcToken } from "@/lib/tokens";
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

type TokenRow = {
  amount: number;
  symbol?: string;
};

async function fetchTokenRows(walletId: string): Promise<TokenRow[]> {
  const initialized = createCircleClient();
  if ("error" in initialized) {
    throw new Error(initialized.error);
  }

  const balances = await initialized.client.getWalletTokenBalance({
    id: walletId,
  });

  return (balances.data?.tokenBalances ?? []).map((entry) => ({
    amount: parseFloat(entry.amount ?? "0"),
    symbol: entry.token?.symbol ?? entry.token?.name,
  }));
}

export async function fetchWalletBalance(walletId: string): Promise<number> {
  try {
    const rows = await fetchTokenRows(walletId);
    let total = 0;
    for (const row of rows) {
      if (Number.isNaN(row.amount)) continue;
      if (isUsdcToken(row.symbol)) total += row.amount;
    }
    return total;
  } catch (err) {
    console.error("[Glide] balance:", err);
    throw err instanceof Error ? err : new Error("Could not load balance");
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

export async function assertSufficientBalance(
  walletId: string,
  amount: number,
): Promise<void> {
  const balance = await fetchWalletBalance(walletId);
  if (amount > balance) {
    throw new Error(
      `Insufficient balance. You have $${balance.toFixed(2)} USDC available.`,
    );
  }
}

export { safeApiError };
