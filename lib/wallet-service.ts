import {
  createCircleClient,
  getOrCreateWalletSetId,
  GLIDE_BLOCKCHAIN,
  safeApiError,
} from "@/lib/circle";
import { fetchOffArcUsdcBalances } from "@/lib/chain-balances";
import { CHAIN_META } from "@/lib/chain-meta";
import {
  ARC_DISPLAY_TOKENS,
  isArcStablecoin,
  isEurcToken,
  isUsdcToken,
  normalizeTokenSymbol,
} from "@/lib/tokens";
import type { GlideTokenBalance, GlideWallet } from "@/lib/types";

const ARC_CHAIN = CHAIN_META["arc-testnet"];

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

export async function fetchWalletTokenBalances(
  walletId: string,
): Promise<GlideTokenBalance[]> {
  const rows = await fetchTokenRows(walletId);
  const amounts = new Map<string, number>();

  for (const row of rows) {
    if (Number.isNaN(row.amount) || row.amount <= 0) continue;
    const symbol = normalizeTokenSymbol(row.symbol);
    if (!isArcStablecoin(symbol)) continue;
    amounts.set(symbol, (amounts.get(symbol) ?? 0) + row.amount);
  }

  const balances: GlideTokenBalance[] = ARC_DISPLAY_TOKENS.map((symbol) => ({
    symbol,
    amount: amounts.get(symbol) ?? 0,
    usdValue: amounts.get(symbol) ?? 0,
    chainId: ARC_CHAIN.id,
    chainLabel: ARC_CHAIN.label,
  }));

  for (const [symbol, amount] of amounts) {
    if (ARC_DISPLAY_TOKENS.includes(symbol as (typeof ARC_DISPLAY_TOKENS)[number])) {
      continue;
    }
    balances.push({
      symbol,
      amount,
      usdValue: amount,
      chainId: ARC_CHAIN.id,
      chainLabel: ARC_CHAIN.label,
    });
  }

  return balances;
}

export async function fetchAllWalletTokenBalances(
  walletId: string,
  walletAddress: string,
): Promise<GlideTokenBalance[]> {
  const arc = await fetchWalletTokenBalances(walletId);
  try {
    const offArc = await fetchOffArcUsdcBalances(walletAddress);
    return [...arc, ...offArc];
  } catch (err) {
    console.warn("[Glide] off-arc balances skipped:", err);
    return arc;
  }
}

export async function fetchUsdcBalance(walletId: string): Promise<number> {
  const tokens = await fetchWalletTokenBalances(walletId);
  return tokens.find((t) => isUsdcToken(t.symbol))?.amount ?? 0;
}

export async function fetchTokenBalance(
  walletId: string,
  symbol: string,
): Promise<number> {
  const tokens = await fetchWalletTokenBalances(walletId);
  const normalized = normalizeTokenSymbol(symbol);
  return (
    tokens.find((t) => normalizeTokenSymbol(t.symbol) === normalized)?.amount ?? 0
  );
}

export async function fetchWalletBalance(walletId: string): Promise<number> {
  try {
    return await fetchUsdcBalance(walletId);
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
  symbol = "USDC",
): Promise<void> {
  const token = normalizeTokenSymbol(symbol);
  const balance = await fetchTokenBalance(walletId, token);
  if (amount > balance) {
    const prefix = isEurcToken(token) ? "€" : "$";
    throw new Error(
      `Insufficient balance. You have ${prefix}${balance.toFixed(2)} ${token} available.`,
    );
  }
}

export { safeApiError };
