import type { Blockchain } from "@circle-fin/developer-controlled-wallets";
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
  return createWalletOnChain(GLIDE_BLOCKCHAIN);
}

/** Create a Circle SCA on any supported blockchain. Used by Universal Receive
 * to spin up Base/Eth/Polygon/Arbitrum wallets for the same wallet set so the
 * user has one identity across chains. */
export async function createWalletOnChain(
  blockchain: string,
): Promise<GlideWallet> {
  const initialized = createCircleClient();
  if ("error" in initialized) throw new Error(initialized.error);

  const { client } = initialized;
  const walletSetId = await getOrCreateWalletSetId(client);

  const walletsResponse = await client.createWallets({
    walletSetId,
    blockchains: [blockchain as Blockchain],
    count: 1,
    accountType: "SCA",
  });

  const wallet = walletsResponse.data?.wallets?.[0];
  if (!wallet?.id || !wallet?.address) {
    throw new Error(`Wallet creation incomplete on ${blockchain}`);
  }

  return { id: wallet.id, address: wallet.address };
}

type TokenRow = {
  amount: number;
  symbol?: string;
  tokenAddress?: string;
  isNative?: boolean;
  tokenId?: string;
};

async function fetchTokenRows(walletId: string): Promise<TokenRow[]> {
  const initialized = createCircleClient();
  if ("error" in initialized) {
    throw new Error(initialized.error);
  }

  const balances = await initialized.client.getWalletTokenBalance({
    id: walletId,
  });

  const raw = (balances.data?.tokenBalances ?? []).map((entry) => ({
    amount: parseFloat(entry.amount ?? "0"),
    symbol: entry.token?.symbol ?? entry.token?.name,
    tokenAddress: entry.token?.tokenAddress?.toLowerCase(),
    isNative: entry.token?.isNative,
    tokenId: entry.token?.id,
  }));

  // Arc-specific: USDC is BOTH the chain's native gas token AND an ERC-20.
  // Circle's API returns the same balance twice (once with isNative:true, no
  // tokenAddress; once as the ERC-20 at 0x3600...). When both exist for the
  // same symbol, drop the native shadow - the ERC-20 row has the correct
  // 6-decimal precision and is the canonical representation.
  const symbolsWithErc20 = new Set(
    raw
      .filter((r) => r.tokenAddress && !r.isNative && r.symbol)
      .map((r) => r.symbol!.toUpperCase()),
  );
  const filtered = raw.filter((r) => {
    if (r.isNative && r.symbol && symbolsWithErc20.has(r.symbol.toUpperCase())) {
      return false;
    }
    return true;
  });

  // Then dedupe by tokenAddress in case Circle ever returns the same ERC-20
  // entry twice (different tokenIds at the same contract).
  const byAddress = new Map<string, TokenRow>();
  const anonymous: TokenRow[] = [];
  for (const row of filtered) {
    if (!row.tokenAddress) {
      anonymous.push(row);
      continue;
    }
    const existing = byAddress.get(row.tokenAddress);
    if (!existing || row.amount > existing.amount) {
      byAddress.set(row.tokenAddress, row);
    }
  }
  return [...byAddress.values(), ...anonymous];
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
  options?: { includeOffArc?: boolean },
): Promise<GlideTokenBalance[]> {
  const arc = await fetchWalletTokenBalances(walletId);
  if (options?.includeOffArc === false) return arc;
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

/** Raw USDC balance on any-chain wallet (returns 0 if no USDC token found).
 * Unlike fetchUsdcBalance which assumes the Arc display set, this reads any
 * supported chain — used by Universal Receive's manual sweep on receive
 * wallets that aren't on Arc. */
export async function fetchUsdcBalanceAnyChain(
  walletId: string,
): Promise<number> {
  const rows = await fetchTokenRows(walletId);
  let total = 0;
  for (const row of rows) {
    if (Number.isNaN(row.amount) || row.amount <= 0) continue;
    if (isUsdcToken(normalizeTokenSymbol(row.symbol))) total += row.amount;
  }
  return total;
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
